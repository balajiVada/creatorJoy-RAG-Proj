"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assemblyai_1 = require("assemblyai");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const runTest = async () => {
    const audioUrl = "https://scontent-ord5-2.cdninstagram.com/o1/v/t2/f2/m78/AQOOAPJFMpYqGbeYOpU6QOUEs1ABrAObmjuOzsb__U3GxUuBb_WZfCemOP0wNHK5qfUePLetXJhX0b3ISNFI3NOq6UzqCY5o5GB23WM.mp4?_nc_cat=111&_nc_sid=9ca052&_nc_ht=scontent-ord5-2.cdninstagram.com&_nc_ohc=EQxlC_7kenUQ7kNvwH6Tzm8&efg=eyJ2ZW5jb2RlX3RhZyI6ImlnLXhwdmRzLmNsaXBzLmMyLUMzLmRhc2hfbG5faGVhYWNfdmJyM19hdWRpbyIsInZpZGVvX2lkIjpudWxsLCJvaWxfdXJsZ2VuX2FwcF9pZCI6OTM2NjE5NzQzMzkyNDU5LCJjbGllbnRfbmFtZSI6ImlnIiwieHB2X2Fzc2V0X2lkIjo5OTczNDcxMTk0MzY1MTAsImFzc2V0X2FnZV9kYXlzIjo1LCJ2aV91c2VjYXNlX2lkIjoxMDA5OSwiZHVyYXRpb25fcyI6NTMsImJpdHJhdGUiOjU0NzM2LCJ1cmxnZW5fc291cmNlIjoid3d3In0%3D&ccb=17-1&_nc_gid=DRe6KRWKg9NtW31uPoqADA&_nc_zt=28&_nc_ss=7a22e&oh=00_Af-WoXGcOeaOSL5FRkVtKenLeHKmBGQrkMccg-EO3WC-gQ&oe=6A2301D0";
    console.log("🚀 Initializing AssemblyAI Client...");
    if (!process.env.ASSEMBLYAI_API_KEY) {
        console.error("❌ No ASSEMBLYAI_API_KEY found in .env");
        return;
    }
    const client = new assemblyai_1.AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });
    console.log("📤 Submitting Instagram Audio URL for Transcription...");
    console.log("URL:", audioUrl.substring(0, 80) + "...");
    try {
        const transcriptResponse = await client.transcripts.transcribe({
            audio: audioUrl
        });
        console.log("\n✅ TRANSCRIPT GENERATED SUCCESSFULLY:");
        console.log("--------------------------------------------------");
        console.log(transcriptResponse.text);
        console.log("--------------------------------------------------");
    }
    catch (error) {
        console.error("❌ Transcription Failed:", error);
    }
};
runTest();
