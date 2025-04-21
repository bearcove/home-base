export type WebSocketMessage =
    | { Headers: HeadersMessage }
    | { Commit: CommitMessage }
    | { UploadDone: UploadDoneMessage }
    | { MediaIdentified: MediaProps }
    | { ConversionProgress: TranscodingProgress }
    | { ConversionDone: ConversionDoneMessage }
    | { ActionDone: ActionDoneMessage }
    | { Error: string };

export type HeadersMessage = {
    page_input_path: string;
    file_name: string;
    file_size: number;
    action: Action;
    paragraph_byte_offset: number;
};

export type UploadDoneMessage = {
    uploaded_size: number;
};

export type MediaProps = {
    kind: MediaKind;
    dims: {
        w: number;
        h: number;
        density: number;
    };
    secs: number;
    ic?: ICodec;
    vp?: VideoParameters;
    ap?: AudioParameters;
};

export type MediaKind = "image" | "video" | "audio" | "diagram";

export type VideoParameters = {
    /** Video codec name from FFmpeg, e.g. "h264", "av1", "vp9" */
    codec?: string;
    /** Frames per second, e.g. 29.97, 30.0, 59.94 */
    frame_rate?: number;
    /** Pixel format from FFmpeg, e.g. "yuv420p", "yuv444p" */
    pix_fmt?: string;
};

export type AudioParameters = {
    /** Audio codec name from FFmpeg, e.g. "aac", "opus" */
    codec?: string;
    /** Audio sample rate in Hz, e.g. 44100, 48000 */
    sample_rate?: number;
    /** Audio channels, e.g. "stereo", "5.1" or "7.1" */
    channels?: string;
};

export type CommitMessage = {
    name: string;
    alt: string;
    title: string;
    is_figure: boolean;
    attr?: string;
    attrlink?: string;
};

export type TranscodingProgress = {
    frame: number;
    fps: number;
    quality: number;
    size_kb: number;
    bitrate_kbps: number;
    speed: number;
    processed_time: number;
    total_time: number;
};

export type ConversionDoneMessage = {
    file_size: number;
};

export type ActionDoneMessage = {
    done: boolean;
};

export type Action = "replace" | "append" | "set_thumb";

export type ICodec = "JXL" | "AVIF" | "WEBP";
