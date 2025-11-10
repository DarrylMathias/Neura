import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request) {
    const ipString = request.headers.get('x-forwarded-for')
    const ip = ipString ? ipString.split(',')[0].trim() : 'Ip not found';
    console.log(ip);
    const res = await axios.get(`https://ipapi.co/${ip}/json/`);
    const data = res.data;
    const { latitude, longitude } = data;
    return NextResponse.json({ ip: ip, latitude, longitude }, { status: 200 })
}