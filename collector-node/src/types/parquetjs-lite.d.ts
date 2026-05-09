declare module 'parquetjs-lite' {
    class ParquetSchema {
        constructor(schema: Record<string, unknown>);
    }

    class ParquetWriter {
        static openFile(schema: ParquetSchema, filePath: string): Promise<ParquetWriter>;
        appendRow(row: Record<string, unknown>): Promise<void>;
        close(): Promise<void>;
    }

    const parquet: {
        ParquetSchema: typeof ParquetSchema;
        ParquetWriter: typeof ParquetWriter;
    };

    export default parquet;
}
