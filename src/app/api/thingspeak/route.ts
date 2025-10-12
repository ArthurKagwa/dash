import { NextResponse } from "next/server";
import { fetchThingSpeakFeeds } from "@/lib/thingspeak";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const resultsParam = searchParams.get("results");
    const minutesParam = searchParams.get("minutes");
    const results = resultsParam ? Number.parseInt(resultsParam, 10) : undefined;
    const minutes = minutesParam ? Number.parseInt(minutesParam, 10) : undefined;

    try {
        const data = await fetchThingSpeakFeeds(
            Number.isFinite(minutes) && minutes
                ? { minutes }
                : Number.isFinite(results) && results
                ? { results }
                : undefined
        );
        return NextResponse.json(data, { status: 200 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error.";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
