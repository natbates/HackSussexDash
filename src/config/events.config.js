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
        { name: "title", label: "Title" },

        { name: "date", label: "Date", type: "date" },

        { name: "location", label: "Location" },

        {
            name: "description",
            label: "Description",
            type: "textarea"
        },

        {
            name: "eventType",
            label: "Event Type",
            type: "select",
            options: EVENT_TYPES
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
            accept: "image/*"
        },

        {
            name: "sponsors",
            label: "Sponsors",
            type: "multiSelect"
        }
    ],

    nested: {
        schedule: {
            label: "Schedule",
            type: "repeatable",
            min: 1,
            max: 3,
            fields: [
                {
                    name: "day",
                    label: "Day"
                },
                {
                    name: "events",
                    label: "Events",
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
        // logo validated via upload success, not isUrl
    }
};
