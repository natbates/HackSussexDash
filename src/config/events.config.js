import {
    isUrl,
    isNonEmptyString,
    isArrayOfStrings
} from "../util/validators";

const EVENT_TYPES = [
    "Coders Cup",
    "Pwn Sussex",
    "Hackathon",
    "Game Jam"
];

export default {
    file: "src/config/events.json",
    mode: "sectioned",
    label: "Event",
    imagePath: "public/config_images/events",

    sections: [
        { key: "upcomingEvents", label: "Upcoming Events" },
        { key: "pastEvents", label: "Past Events" }
    ],

    fields: [
        { name: "title", label: "Title", required: true },

        { name: "date", label: "Date", type: "date", required: true },

        { name: "location", label: "Location" },

        {
            name: "description",
            label: "Description",
            type: "textarea",
        },

        {
            name: "eventType",
            label: "Event Type",
            type: "select",
            options: EVENT_TYPES,
            required: true
        },

        {
            name: "ticketsLink",
            label: "Tickets Link",
            type: "url"
        },

        {
            name: "logo",
            label: "Event Logo",
            type: "file",
            accept: "image/*",
            required: true
        },

        {
            name: "sponsors",
            label: "Sponsors",
            type: "sponsorTiers"
        }
    ],

    nested: {
        schedule: {
            label: "Schedule",
            type: "object",
            fields: [
                {
                    name: "day1",
                    label: "Day 1",
                    type: "repeatable",
                    fields: [
                        {
                            name: "time",
                            label: "Time"
                        },
                        {
                            name: "title",
                            label: "Title"
                        },
                        {
                            name: "description",
                            label: "Description",
                            optional: true
                        }
                    ]
                },
                {
                    name: "day2",
                    label: "Day 2",
                    type: "repeatable",
                    fields: [
                        {
                            name: "time",
                            label: "Time"
                        },
                        {
                            name: "title",
                            label: "Title"
                        },
                        {
                            name: "description",
                            label: "Description",
                            optional: true
                        }
                    ]
                },
                {
                    name: "day3",
                    label: "Day 3",
                    type: "repeatable",
                    fields: [
                        {
                            name: "time",
                            label: "Time"
                        },
                        {
                            name: "title",
                            label: "Title"
                        },
                        {
                            name: "description",
                            label: "Description",
                            optional: true
                        }
                    ]
                }
            ]
        }
    },

    searchFields: [
        "title",
        "location",
        "eventType",
        "description"
    ],

    filters: [
        {
            field: "eventType",
            label: "Event Type",
            options: EVENT_TYPES
        }
    ],

    validation: {
        title: isNonEmptyString,
        date: isNonEmptyString,
        location: isNonEmptyString,
        description: isNonEmptyString,
        eventType: isNonEmptyString,
        ticketsLink: isUrl
    }
};
