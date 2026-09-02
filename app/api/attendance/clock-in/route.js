import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, getClientDevice, lagosLocalParts, locationMismatchFlag } from "@/lib/attendanceEvidence";

export async function POST(request) {
  try {
    return await handleClockIn(request);
  } catch (err) {
    console.error("clock-in route threw:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't clock in." },
      { status: 500 }
    );
  }
}

async function handleClockIn(request) {
  const { work_location, session_id } = await request.json();

  if (!["office", "remote"].includes(work_location)) {
    return NextResponse.json({ error: "Choose whether you're working from the office or remote." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!employee) {
    return NextResponse.json({ error: "You're not linked to an employee record yet." }, { status: 400 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("standard_start_time, late_grace_minutes")
    .eq("id", profile.company_id)
    .single();

  const { data: trustedNetworks } = await supabase
    .from("attendance_trusted_networks")
    .select("ip_prefix")
    .eq("company_id", profile.company_id);

  const ip = getClientIp(request);
  const device = getClientDevice(request);
  const { workDate, hour, minute } = lagosLocalParts();

  // 6.1 — auto-'late' only if the company has actually configured a
  // standard start time; otherwise every clock-in defaults to
  // 'present' and lateness stays a manual call.
  let status = "present";
  if (company?.standard_start_time) {
    const [startHour, startMinute] = company.standard_start_time.split(":").map(Number);
    const graceMinutes = company.late_grace_minutes ?? 15;
    const clockInMinutes = hour * 60 + minute;
    const cutoffMinutes = startHour * 60 + startMinute + graceMinutes;
    if (clockInMinutes > cutoffMinutes) status = "late";
  }

  const flagReason = locationMismatchFlag(work_location, ip, trustedNetworks);

  const { data, error: dbError } = await supabase
    .from("attendance_records")
    .insert({
      employee_id: employee.id,
      company_id: profile.company_id,
      work_date: workDate,
      clock_in: new Date().toISOString(),
      work_location,
      status,
      clock_in_ip: ip,
      clock_in_device: device,
      clock_in_session_id: session_id || null,
      flagged: Boolean(flagReason),
      flag_reason: flagReason,
    })
    .select("id, clock_in, clock_out, work_location, status")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ record: data });
}
