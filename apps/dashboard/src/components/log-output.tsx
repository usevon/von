"use client";

import { Card, CardHeader, CardPanel, CardTitle, ScrollArea } from "@usevon/ui";
import { useEffect, useRef } from "react";

type LogEntry = {
  id: string;
  entry: string;
};

type LogOutputProps = {
  entries: LogEntry[];
};

export const LogOutput = (props: LogOutputProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [props.entries]);

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <CardTitle>Log Output</CardTitle>
      </CardHeader>
      <CardPanel className="min-h-0 flex-1 p-0">
        <ScrollArea className="p-4">
          {props.entries.map((item) => (
            <pre
              className="whitespace-pre-wrap text-neutral-600 text-xs dark:text-neutral-400"
              key={item.id}
            >
              {item.entry}
            </pre>
          ))}
          <div ref={bottomRef} />
        </ScrollArea>
      </CardPanel>
    </Card>
  );
};
