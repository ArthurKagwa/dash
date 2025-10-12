export interface ThingSpeakFeed {
    created_at: string;
    entry_id: number;
    field1?: string | null;
    field2?: string | null;
    field3?: string | null;
    field4?: string | null;
    field5?: string | null;
}

export interface ThingSpeakChannel {
    id: number;
    name?: string;
    last_entry_id?: number;
}

export interface ThingSpeakResponse {
    channel?: ThingSpeakChannel | null;
    feeds?: ThingSpeakFeed[];
}

export interface SensorSnapshot {
    temperature: number | null;
    humidity: number | null;
    motionCount: number | null;
    batteryVoltage: number | null;
    timestamp: string | null;
}
