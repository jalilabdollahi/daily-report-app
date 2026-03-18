"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

export function PrintTrigger() {
  return (
    <Button
      className="print:hidden"
      onClick={() => window.print()}
      type="button"
      variant="outline"
    >
      <Printer className="mr-2 h-4 w-4" />
      Print
    </Button>
  );
}
