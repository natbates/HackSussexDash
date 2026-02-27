import {
    isUrl,
    isBoolean
} from "../util/validators";

export default {
    file: "src/config/siteData.json",
    mode: "singleton",
    label: "Site Data",

    fields: [
        { name: "discord", label: "Discord", required: true },
        { name: "instagram", label: "Instagram", required: true },
        { name: "x", label: "X / Twitter", required: true },
        { name: "youtube", label: "YouTube", required: true },
        { name: "tiktok", label: "TikTok", required: true },
        { name: "merch", label: "Merch Store", required: true },
        { name: "mlhToggle", label: "MLH Enabled", type: "boolean", required: true }
    ],

    validation: {
        discord: isUrl,
        instagram: isUrl,
        linkedin: isUrl,
        x: isUrl,
        youtube: isUrl,
        tiktok: isUrl,
        merch: isUrl,
        mlhToggle: isBoolean
    }
};
