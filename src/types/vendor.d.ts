declare module "papaparse" {
  export type ParseError = {
    code: string;
    message: string;
    row?: number;
    type: string;
  };

  export type ParseResult<T> = {
    data: T[];
    errors: ParseError[];
    meta: {
      fields?: string[];
    };
  };

  export type ParseConfig<T> = {
    header?: boolean;
    skipEmptyLines?: boolean | "greedy";
    transformHeader?: (header: string) => string;
    complete?: (results: ParseResult<T>) => void;
    error?: (error: Error) => void;
  };

  export function parse<T = Record<string, string>>(
    input: string,
    config?: ParseConfig<T>,
  ): ParseResult<T>;
}

declare module "pdfkit" {
  class PDFDocument {
    constructor(options?: Record<string, unknown>);
    y: number;
    x: number;
    page: { width: number; height: number; margins: { left: number; right: number; top: number; bottom: number } };
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, options?: Record<string, unknown>): this;
    text(
      text: string,
      x?: number,
      y?: number,
      options?: Record<string, unknown>,
    ): this;
    moveDown(lines?: number): this;
    addPage(): this;
    rect(x: number, y: number, width: number, height: number): this;
    fill(color?: string): this;
    stroke(color?: string): this;
    on(event: string, callback: (...args: unknown[]) => void): this;
    bufferPages(): this;
    bufferedPageRange(): { start: number; count: number };
    switchToPage(pageNumber: number): this;
    flushPages(): this;
    end(): void;
  }

  export default PDFDocument;
}

declare module "nodemailer" {
  export type SendMailOptions = {
    from?: string;
    to?: string;
    subject?: string;
    text?: string;
    html?: string;
  };

  export function createTransport(options?: Record<string, unknown>): {
    sendMail(options: SendMailOptions): Promise<unknown>;
  };
}
