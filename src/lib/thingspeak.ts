import { ThingSpeakFeed, ThingSpeakResponse, SensorSnapshot } from "@/types/thingspeak";

export const DEFAULT_RESULTS = 50;
export const DEFAULT_RANGE_MINUTES = 360;

type FetchOptions =
    | {
          results?: number;
          minutes?: undefined;
      }
    | {
          results?: undefined;
          minutes?: number;
      };

export async function fetchThingSpeakFeeds(options: FetchOptions = {}): Promise<ThingSpeakResponse> {
    const { results = DEFAULT_RESULTS, minutes } = options;
    const channelId =
        process.env.THINGSPEAK_CHANNEL_ID ?? process.env.NEXT_PUBLIC_THINGSPEAK_CHANNEL_ID;
    const readKey =
        process.env.THINGSPEAK_READ_KEY ?? process.env.NEXT_PUBLIC_THINGSPEAK_READ_KEY;

    if (!channelId || !readKey) {
        throw new Error("ThingSpeak channel id or read key missing.");
    }

    const url = new URL(
        `https://api.thingspeak.com/channels/${channelId}/feeds.json`
    );
    url.searchParams.set("api_key", readKey);
    if (typeof minutes === "number" && Number.isFinite(minutes) && minutes > 0) {
        url.searchParams.set("minutes", minutes.toString());
    } else {
        url.searchParams.set("results", results.toString());
    }

    const response = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        // Defer caching responsibility to the calling component.
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`ThingSpeak request failed with status ${response.status}.`);
    }

    return (await response.json()) as ThingSpeakResponse;
}

export function buildSnapshot(feeds: ThingSpeakFeed[]): SensorSnapshot {
    if (!feeds.length) {
        return {
            temperature: null,
            humidity: null,
            motionCount: null,
            batteryVoltage: null,
            timestamp: null
        };
    }

    const latest = feeds[feeds.length - 1];

    return {
        temperature: toNumber(latest.field4),  // Temperature is field4
        humidity: toNumber(latest.field2),     // Humidity is field2
        motionCount: toNumber(latest.field3),  // Motion is field3
        batteryVoltage: toNumber(latest.field1), // Battery is field1
        timestamp: latest.created_at ?? null
    };
}

export function mapSeries(feeds: ThingSpeakFeed[]) {
    return feeds.map((feed) => ({
        timestamp: feed.created_at,
        temperature: toNumber(feed.field4),  // Temperature is field4
        humidity: toNumber(feed.field2)      // Humidity is field2
    }));
}

function toNumber(value: string | null | undefined): number | null {
    if (value === null || value === undefined) {
        return null;
    }
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
}
