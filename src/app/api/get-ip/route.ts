import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ securityKey: string }>;
  }
) {
  const { securityKey } = await params;
  if (!securityKey)
    return NextResponse.json(
      { error: "Security key is required" },
      { status: 400 }
    );
  if (securityKey !== process.env.API_SECURITY_KEY) {
    return NextResponse.json(
      { error: "Invalid security key" },
      { status: 403 }
    );
  }
  const ipString = request.headers.get("x-forwarded-for");
  const ip = ipString ? ipString.split(",")[0].trim() : "Ip not found";
  console.log(ip);
  const res = await axios.get(`https://ipapi.co/${ip}/json/`);
  const data = res.data;
  const { latitude, longitude } = data;
  return NextResponse.json({ ip: ip, latitude, longitude }, { status: 200 });
}
