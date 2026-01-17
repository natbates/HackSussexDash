import {
    isUrl,
    isBoolean
} from "../util/validators";

export default {
    file: "src/config/siteData.json",
    mode: "singleton",

    fields: [
        { name: "discord", label: "Discord" },
        { name: "instagram", label: "Instagram" },
        { name: "x", label: "X / Twitter" },
        { name: "youtube", label: "YouTube" },
        { name: "tiktok", label: "TikTok" },
        { name: "merch", label: "Merch Store" },
        { name: "mlhToggle", label: "MLH Enabled", type: "boolean" }
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
