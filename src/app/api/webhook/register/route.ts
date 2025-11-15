import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import prisma from "@/lib/prisma";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  const body = await req.text();

  const svixId = req.headers.get("svix-id")!;
  const svixTimestamp = req.headers.get("svix-timestamp")!;
  const svixSignature = req.headers.get("svix-signature")!;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET!);

  let event: any;
  try {
    try {
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    console.log(event.data);
    console.log(`Received webhook with event type of ${event.type}`);
    if (event.type === "user.created") {
      const {
        id,
        email_addresses,
        primary_email_address_id,
        first_name,
        last_name,
      } = event.data;
      const emailObj = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );
      const email = emailObj?.email_address;
      await prisma.user.create({
        data: {
          id,
          email,
          first_name: first_name,
          last_name: last_name,
        },
      });
    } else if (event.type === "user.updated") {
      const {
        id,
        email_addresses,
        primary_email_address_id,
        first_name,
        last_name,
      } = event.data;
      const emailObj = email_addresses.find(
        (email) => email.id === primary_email_address_id
      );
      const email = emailObj?.email_address;
      await prisma.user.update({
        where: {
          id,
        },
        data: {
          email,
          first_name: first_name,
          last_name: last_name,
        },
      });
    } else if (event.type === "user.deleted") {
      const { id } = event.data;
      await prisma.user.delete({
        where: {
          id,
        },
      });
    }
    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: JSON.stringify(err) }, { status: 400 });
  }
}
