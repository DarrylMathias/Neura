import { Supermemory } from "supermemory";
import dotenv from "dotenv";
dotenv.config();


console.log(process.env.SUPERMEMORY_API_KEY);

const client = new Supermemory({
    apiKey: process.env.SUPERMEMORY_API_KEY,
});

await client.memories.add({
    content: "This is the content of my first memory.",
});