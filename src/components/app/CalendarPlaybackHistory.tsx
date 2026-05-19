import { CalendarDays, ChevronLeft, ChevronRight, MapPin, MonitorPlay, Search } from "lucide-react";
import * as React from "react";

type LocationOption = {
  id: string;
  name: string;
  kind: string | null;
};

export type PlaybackHistoryRow = {
  id: string;
  played_at: string;
  location_id: string;
  location_name: string;
  slot_number: number;
  video_title: string;
  machine_id: string | null;
};

type Props = {
  rows: PlaybackHistoryRow[];
  locations: LocationOption[];
  initialMonth: string;
  initialSelectedDate: string;
};

const TAIWAN_TIME_ZONE = "Asia/Taipei";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TAIWAN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const englishMonthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TAIWAN_TIME_ZONE,
  month: "long",
  year: "numeric"
});

const mandarinMonthFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TAIWAN_TIME_ZONE,
  month: "long",
  year: "numeric"
});

const englishDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TAIWAN_TIME_ZONE,
  dateStyle: "full"
});

const mandarinDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  timeZone: TAIWAN_TIME_ZONE,
  dateStyle: "full"
});

const taiwanDatePartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TAIWAN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function toTaiwanDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = taiwanDatePartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function dateFromTaiwanDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00+08:00`);
}

function getDaysInMonth(monthValue: string) {
  const [year, month] = monthValue.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0));
  const leadingDays = firstDay.getUTCDay();
  const days: Array<{ dayNumber: number; key: string; inMonth: boolean }> = [];

  for (let index = leadingDays; index > 0; index -= 1) {
    const date = new Date(Date.UTC(year, month - 1, 1 - index));
    days.push({
      dayNumber: date.getUTCDate(),
      key: dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      inMonth: false
    });
  }

  for (let day = 1; day <= lastDay.getUTCDate(); day += 1) {
    days.push({
      dayNumber: day,
      key: dateKeyFromParts(year, month, day),
      inMonth: true
    });
  }

  while (days.length % 7 !== 0) {
    const nextIndex = days.length - leadingDays - lastDay.getUTCDate() + 1;
    const date = new Date(Date.UTC(year, month - 1, lastDay.getUTCDate() + nextIndex));
    days.push({
      dayNumber: date.getUTCDate(),
      key: dateKeyFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      inMonth: false
    });
  }

  return days;
}

function shiftMonth(monthValue: string, offset: number) {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

function updateMonthUrl(monthValue: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("month", monthValue);
  url.searchParams.delete("date");
  window.location.assign(url.toString());
}

export function CalendarPlaybackHistory({ rows, locations, initialMonth, initialSelectedDate }: Props) {
  const [locationId, setLocationId] = React.useState("all");
  const [selectedDate, setSelectedDate] = React.useState(initialSelectedDate);

  const filteredRows = React.useMemo(
    () => rows.filter((row) => locationId === "all" || row.location_id === locationId),
    [locationId, rows]
  );

  const rowsByDate = React.useMemo(() => {
    const map = new Map<string, PlaybackHistoryRow[]>();

    for (const row of filteredRows) {
      const key = toTaiwanDateKey(row.played_at);
      const existing = map.get(key) ?? [];
      existing.push(row);
      map.set(key, existing);
    }

    for (const entries of map.values()) {
      entries.sort((a, b) => Date.parse(b.played_at) - Date.parse(a.played_at));
    }

    return map;
  }, [filteredRows]);

  React.useEffect(() => {
    if (rowsByDate.has(selectedDate)) return;

    const firstActiveDate = Array.from(rowsByDate.keys()).sort()[0];
    setSelectedDate(firstActiveDate ?? initialSelectedDate);
  }, [initialSelectedDate, rowsByDate, selectedDate]);

  const days = React.useMemo(() => getDaysInMonth(initialMonth), [initialMonth]);
  const selectedRows = rowsByDate.get(selectedDate) ?? [];
  const activeDates = rowsByDate.size;
  const totalPlaybacks = filteredRows.length;
  const selectedLocation = locations.find((location) => location.id === locationId);
  const monthDate = dateFromTaiwanDateKey(`${initialMonth}-01`);
  const selectedDateValue = dateFromTaiwanDateKey(selectedDate);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_25rem]">
      <section className="app-panel">
        <div className="grid gap-4">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase text-muted-foreground">
              <span className="i18n-en">Playback calendar</span>
              <span className="i18n-zh">播放日曆</span>
            </p>
            <h2 className="mt-2 text-xl font-bold">
              <span className="i18n-en">{englishMonthFormatter.format(monthDate)}</span>
              <span className="i18n-zh">{mandarinMonthFormatter.format(monthDate)}</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="i18n-en">
                {totalPlaybacks} playbacks recorded across {activeDates} active dates in Tainan, Taiwan time.
              </span>
              <span className="i18n-zh">
                以台灣台南時間計算，共有 {totalPlaybacks} 次播放，分布於 {activeDates} 個活躍日期。
              </span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)] lg:max-w-xl">
            <label className="grid gap-1 text-sm font-semibold">
              <span className="i18n-en">Month</span>
              <span className="i18n-zh">月份</span>
              <div className="flex">
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-l-md border bg-card text-muted-foreground hover:bg-muted"
                  onClick={() => updateMonthUrl(shiftMonth(initialMonth, -1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <input
                  className="h-10 min-w-0 flex-1 border-y bg-background px-3 text-sm"
                  type="month"
                  value={initialMonth}
                  onChange={(event) => updateMonthUrl(event.currentTarget.value)}
                />
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-r-md border bg-card text-muted-foreground hover:bg-muted"
                  onClick={() => updateMonthUrl(shiftMonth(initialMonth, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </label>

            <label className="grid gap-1 text-sm font-semibold">
              <span className="i18n-en">Location</span>
              <span className="i18n-zh">地點</span>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={locationId}
                onChange={(event) => setLocationId(event.currentTarget.value)}
              >
                <option value="all">All locations / 所有地點</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-bold uppercase text-muted-foreground">
          {[
            ["Sun", "日"],
            ["Mon", "一"],
            ["Tue", "二"],
            ["Wed", "三"],
            ["Thu", "四"],
            ["Fri", "五"],
            ["Sat", "六"]
          ].map(([english, mandarin]) => (
            <div key={english} className="py-2">
              <span className="i18n-en">{english}</span>
              <span className="i18n-zh">{mandarin}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const count = rowsByDate.get(day.key)?.length ?? 0;
            const isSelected = day.key === selectedDate;
            const isToday = day.key === toTaiwanDateKey(new Date());

            return (
              <button
                key={`${day.key}-${day.inMonth ? "current" : "outside"}`}
                type="button"
                className={[
                  "min-h-20 rounded-md border p-2 text-left transition-colors",
                  day.inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground opacity-60",
                  isSelected ? "border-primary bg-primary/10 text-primary" : "hover:border-primary/50",
                  count > 0 && !isSelected ? "border-primary/30" : "",
                  isToday && !isSelected ? "ring-1 ring-primary/40" : ""
                ].join(" ")}
                onClick={() => setSelectedDate(day.key)}
              >
                <span className="text-sm font-bold">{day.dayNumber}</span>
                {count > 0 ? (
                  <span className="mt-3 flex items-center gap-1 text-xs font-semibold">
                    <span className="size-2 rounded-full bg-primary" />
                    {count} <span className="i18n-en">{count === 1 ? "play" : "plays"}</span><span className="i18n-zh">次播放</span>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {filteredRows.length === 0 ? (
          <div className="mt-5 rounded-md border bg-background p-5 text-sm text-muted-foreground">
            <Search className="mb-3 size-5 text-muted-foreground" />
            <span className="i18n-en">No playback history for the selected month and location.</span>
            <span className="i18n-zh">所選月份與地點沒有播放歷史。</span>
          </div>
        ) : null}
      </section>

      <aside className="app-panel self-start">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">
              <span className="i18n-en">Selected date</span>
              <span className="i18n-zh">選取日期</span>
            </p>
            <h2 className="mt-2 text-xl font-bold">
              <span className="i18n-en">{englishDateFormatter.format(selectedDateValue)}</span>
              <span className="i18n-zh">{mandarinDateFormatter.format(selectedDateValue)}</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedLocation ? selectedLocation.name : <><span className="i18n-en">All locations</span><span className="i18n-zh">所有地點</span></>}
            </p>
          </div>
          <div className="grid size-10 place-items-center rounded-md bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[22rem] text-left text-sm">
            <thead className="border-b text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-3 pr-3"><span className="i18n-en">Time</span><span className="i18n-zh">時間</span></th>
                <th className="py-3 pr-3"><span className="i18n-en">Detail</span><span className="i18n-zh">詳細資料</span></th>
              </tr>
            </thead>
            <tbody>
              {selectedRows.length === 0 ? (
                <tr>
                  <td className="py-5 text-muted-foreground" colSpan={2}>
                    <span className="i18n-en">No playback on this date.</span>
                    <span className="i18n-zh">此日期沒有播放紀錄。</span>
                  </td>
                </tr>
              ) : (
                selectedRows.map((row) => (
                  <tr className="border-b last:border-0" key={row.id}>
                    <td className="py-3 pr-3 align-top font-semibold">{timeFormatter.format(new Date(row.played_at))}</td>
                    <td className="py-3 pr-3">
                      <p className="font-semibold">{row.video_title}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {row.location_name} · <span className="i18n-en">Slot</span><span className="i18n-zh">槽位</span> {row.slot_number}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MonitorPlay className="size-3.5" />
                        {row.machine_id || <><span className="i18n-en">Demo machine</span><span className="i18n-zh">示範機器</span></>}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
}
