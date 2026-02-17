import { isUrl, isNonEmptyString } from "../util/validators";

export default {
    file: "src/config/sponsors.json",
    mode: "collection",
    imagePath: "public/config_images/sponsors",

    fields: [
        { name: "name", label: "Name", required: true },
        { name: "website", label: "Website" },
        { name: "logoUrl", label: "Logo", type: "file", required: true }
    ],

    searchFields: ["name"],

    filters: [],

    validation: {
        name: isNonEmptyString,
        website: isUrl,
        logoUrl: isUrl
    }
};
