import {
    isUrl,
    isBoolean,
    isArrayOfStrings,
    isNonEmptyString
} from "../util/validators";

const ROLE_OPTIONS = [
    "President",
    "Web development",
    "Social Media",
    "Designer",
    "Graphic Design",
    "Head of Media",
    "Secretary",
    "Competitive Programming",
    "Media production",
    "Welfare",
    "Finance",
    "General Committee",
    "Mentor",
    "Other"
];


export default {
    file: "src/config/committee.json",
    mode: "collection",
    label: "Committee Member",
    imagePath: "public/config_images/committee",

    fields: [
        {
            name: "name",
            label: "Name"
        },

        {
            name: "role",
            label: "Role",
            type: "select",
            options: ROLE_OPTIONS
        },

        {
            name: "image",
            label: "Image",
            type: "file"
        },

        {
            name: "pastCommittee",
            label: "Past Committee",
            type: "boolean"
        },

        {
            name: "years",
            label: "Years (comma separated)",
            placeholder: "2024, 2025",
            parse: "csv"
        }
    ],

    searchFields: ["name", "role"],

    filters: [
        {
            field: "role",
            label: "Role",
            options: ROLE_OPTIONS
        },
        {
            field: "pastCommittee",
            label: "Past Committee",
            options: [true, false]
        }
    ],

    validation: {
        name: isNonEmptyString,
        role: isNonEmptyString,
        image: isUrl,
        pastCommittee: isBoolean,
        years: isArrayOfStrings
    }
};
