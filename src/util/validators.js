export const isNonEmptyString = (v) =>
    typeof v === "string" && v.trim().length > 0;

export const isUrl = (v) => {
    if (!v) return true;
    try {
        new URL(v);
        return true;
    } catch {
        return false;
    }
};

export const isBoolean = (v) => typeof v === "boolean";

export const isArrayOfStrings = (value) =>
    Array.isArray(value) &&
    value.every(
        (v) => typeof v === "string" && v.trim().length > 0
    );


export const validateFields = (data, rules) => {
    const errors = {};

    for (const key in rules) {
        const valid = rules[key](data[key]);
        if (!valid) errors[key] = true;
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
};
