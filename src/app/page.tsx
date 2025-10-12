import { Dashboard } from "@/components/Dashboard";
import { fetchThingSpeakFeeds, DEFAULT_RANGE_MINUTES } from "@/lib/thingspeak";
import { ThingSpeakFeed } from "@/types/thingspeak";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    let feeds: ThingSpeakFeed[] = [];
    let channelName: string | undefined;
    let initialError: string | null = null;

    try {
        const data = await fetchThingSpeakFeeds({ minutes: DEFAULT_RANGE_MINUTES });
        feeds = data.feeds ?? [];
        channelName = data.channel?.name;
    } catch (error) {
        initialError = error instanceof Error ? error.message : "Unable to load ThingSpeak data.";
        console.error("Failed to load ThingSpeak data:", error);
    }

    return (
        <Dashboard
            initialFeeds={feeds}
            channelName={channelName}
            initialError={initialError}
            initialRangeMinutes={DEFAULT_RANGE_MINUTES}
        />
    );
}
