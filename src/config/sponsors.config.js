import { isUrl, isNonEmptyString } from "../util/validators";

export default {
    file: "src/config/sponsors.json",
    mode: "collection",
    imagePath: "public/config_images/sponsors",

    fields: [
        { name: "name", label: "Name" },
        { name: "website", label: "Website" },
        { name: "logoUrl", label: "Logo", type: "file" }
    ],

    searchFields: ["name"],

    filters: [], // no filters for now, can add later

    validation: {
        name: isNonEmptyString,
        website: isUrl,
        logoUrl: isUrl
    }
};
