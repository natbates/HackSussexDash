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
    label: "Events",
    imagePath: "public/config_images/events",

    sections: [
        { key: "upcomingEvents", label: "Upcoming Events" },
        { key: "pastEvents", label: "Past Events" }
    ],

    fields: [
        { name: "title", label: "Title", required: true },

        // new checkbox determines whether this event belongs in the past section
        { name: "past", label: "Past event", type: "boolean" },

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
            type: "repeatable",
            min: 0,
            max: 3,
            fields: [
                {
                    name: "events",
                    label: "Events",
                    type: "repeatable",
                    fields: [
                        {
                            name: "time",
                            label: "Time",
                            type: "time",
                            required: true
                        },
                        {
                            name: "title",
                            label: "Title",
                            required: true
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
