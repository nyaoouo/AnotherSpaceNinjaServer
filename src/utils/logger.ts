import { createLogger, format, transports, Logger, LeveledLogMethod, addColors } from "winston";
import "winston-daily-rotate-file";
import { config } from "@/src/services/configService";
import * as util from "util";
import { isEmptyObject } from "@/src/helpers/general";

// const combineMessageAndSplat = () => {
//     return {
//         transform: (info: any, _opts: any) => {
//             //combine message and args if any
//             info.message = util.format(info.message, ...(info[Symbol.for("splat")] || []));
//             return info;
//         }
//     };
// };

// const alwaysAddMetadata = () => {
//     return {
//         transform(info: any) {
//             if (info[Symbol.for("splat")] === undefined) return info;
//             info.meta = info[Symbol.for("splat")]; //[0].meta;
//             return info;
//         }
//     };
// };

//TODO: in production utils.inspect might be slowing down requests see utils.inspect
const consolelogFormat = format.printf(info => {
    let result = `${info.timestamp as string} [${info.version as string}] ${info.level}:`;
    // Add module information if present (from child loggers)
    if (info.module) result += `  [${info.module as string}]`;
    result += `${info.message as string}`;
    if (!isEmptyObject(info.metadata)) {
        const metadataString = util.inspect(info.metadata, {
            showHidden: false,
            depth: null,
            colors: true
        });
        result += ` ${metadataString}`;
    }
    return result;
});

const fileFormat = format.combine(
    format.uncolorize(),
    //combineMessageAndSplat(),
    format.timestamp(),
    format.json()
);

const errorLog = new transports.DailyRotateFile({
    filename: "logs/error.log",
    format: fileFormat,
    level: "error",
    datePattern: "YYYY-MM-DD"
});
const combinedLog = new transports.DailyRotateFile({
    filename: "logs/combined.log",
    format: fileFormat,
    datePattern: "YYYY-MM-DD"
});

const consoleLog = new transports.Console({
    forceConsole: false,
    format: format.combine(
        format.colorize(),
        format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss:SSS" }), // uses local timezone
        //combineMessageAndSplat(),
        //alwaysAddMetadata(),
        format.errors({ stack: true }),
        format.align(),
        format.metadata({ fillExcept: ["message", "level", "timestamp", "version", "module"] }),
        consolelogFormat
    )
});

const transportOptions = config.logger.files ? [consoleLog, errorLog, combinedLog] : [consoleLog];

//possible log levels: { fatal: 0, error: 1, warn: 2, info: 3, http: 4, debug: 5, trace: 6 },
const logLevels = {
    levels: {
        fatal: 0,
        error: 1,
        warn: 2,
        info: 3,
        http: 4,
        debug: 5,
        trace: 6
    },
    colors: {
        fatal: "red",
        error: "red",
        warn: "yellow",
        info: "green",
        http: "green",
        debug: "magenta",
        trace: "cyan"
    }
};

export const logger = createLogger({
    levels: logLevels.levels,
    level: config.logger.level,
    defaultMeta: { version: process.env.npm_package_version },
    transports: transportOptions
}) as Logger & Record<keyof typeof logLevels.levels, LeveledLogMethod>;

addColors(logLevels.colors);

errorLog.on("new", filename => logger.info(`Using error log file: ${filename}`));
combinedLog.on("new", filename => logger.info(`Using combined log file: ${filename}`));
errorLog.on("rotate", filename => logger.info(`Rotated error log file: ${filename}`));
combinedLog.on("rotate", filename => logger.info(`Rotated combined log file: ${filename}`));

export const logError = (err: Error, context: string): void => {
    if (err.stack) {
        const stackArr = err.stack.split("\n");
        stackArr[0] += ` while ${context}`;
        logger.error(stackArr.join("\n"));
    } else {
        logger.error(`uncaught error while ${context}: ${err.message}`);
    }
};
