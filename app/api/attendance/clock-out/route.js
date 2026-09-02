import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, getClientDevice, lagosLocalParts } from "@/lib/attendanceEvidence";

export async function POST(request) {
  try {
    return await handleClockOut(request);
  } catch (err) {
    console.error("clock-out route threw:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't clock out." },
      { status: 500 }
    );
  }
}

async function handleClockOut(request) {
  const { session_id } = await request.json();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!employee) {
    return NextResponse.json({ error: "You're not linked to an employee record yet." }, { status: 400 });
  }

  const { workDate } = lagosLocalParts();

  const { data: existing } = await supabase
    .from("attendance_records")
    .select("id, clock_in_ip, clock_in_device, clock_in_session_id, flagged, flag_reason")
    .eq("employee_id", employee.id)
    .eq("work_date", workDate)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "No clock-in found for today." }, { status: 400 });
  }

  const ip = getClientIp(request);
  const device = getClientDevice(request);

  // 6.2/6.3 — the one comparison the brief's own example calls for:
  // does clock-out look like it came from the same place/device/
  // browser session as clock-in. A mismatch doesn't block anything,
  // it just gets surfaced for HR to look at if they want to.
  const mismatchReasons = [];
  if (existing.clock_in_ip && ip !== "unknown" && existing.clock_in_ip !== ip) {
    mismatchReasons.push("Clocked out from a different network than clocked in.");
  }
  if (existing.clock_in_session_id && session_id && existing.clock_in_session_id !== session_id) {
    mismatchReasons.push("Clocked out from a different browser session than clocked in.");
  }

  const combinedFlagReason = [existing.flag_reason, ...mismatchReasons].filter(Boolean).join(" ");

  const { data, error: dbError } = await supabase
    .from("attendance_records")
    .update({
      clock_out: new Date().toISOString(),
      clock_out_ip: ip,
      clock_out_device: device,
      clock_out_session_id: session_id || null,
      flagged: existing.flagged || mismatchReasons.length > 0,
      flag_reason: combinedFlagReason || null,
    })
    .eq("id", existing.id)
    .select("id, clock_in, clock_out, work_location, status")
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 });
  }

  return NextResponse.json({ record: data });
}
