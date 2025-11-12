import prisma from "@/lib/prisma";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const event = await verifyWebhook(req);
    // console.log(event.data);
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
    return NextResponse.json({ message: "Success", status: 200 });
  } catch (err) {
    return NextResponse.json({ error: JSON.stringify(err), status: 400 });
  }
}
