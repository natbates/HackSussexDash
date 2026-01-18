import { useState, useMemo } from "react";
import { validateFields } from "../../util/validators";
import useCrud from "../../hooks/useCrud.jsx";
import Loader from "../misc/loading.jsx";
import styles from "./entityForm.module.css";

export default function EntityForm({
  config,
  initialData = {},
  onSave,
  onCancel
}) {
  const buildDefaults = () => {
    const defaults = {};
    config.fields.forEach(f => {
      if (f.type === "boolean") defaults[f.name] = false;
      else if (
        f.type === "array" ||
        f.type === "multiSelect" ||
        f.parse === "csv"
      )
        defaults[f.name] = [];
      else defaults[f.name] = "";
    });

    if (config.nested) {
      Object.entries(config.nested).forEach(([key, nested]) => {
        if (nested.type === "repeatable") defaults[key] = [];
      });
    }

    return defaults;
  };

  const [data, setData] = useState(() => ({
    ...buildDefaults(),
    ...initialData
  }));

  const [originalData] = useState(() => ({
    ...buildDefaults(),
    ...initialData
  }));

  const [errors, setErrors] = useState({});
  const [fileUploads, setFileUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(initialData?.id);
  const isSingleton = config.mode === "singleton";

  /* -------- SPONSORS -------- */
  const hasSponsorsField = config.fields?.some(
    f => f.name === "sponsors" && f.type === "multiSelect"
  );
  const { data: sponsorsData } = useCrud(
    hasSponsorsField ? "src/config/sponsors.json" : null
  );

  const preparedData = useMemo(() => {
    const out = { ...data };

    config.fields?.forEach(f => {
      if (f.parse === "csv" && typeof out[f.name] === "string") {
        out[f.name] = out[f.name]
          .split(",")
          .map(v => v.trim())
          .filter(Boolean);
      }
    });

    return out;
  }, [data, config.fields]);

  const hasChanges =
    JSON.stringify(preparedData) !== JSON.stringify(originalData) ||
    Object.keys(fileUploads).length > 0;

  /* -------- ACTIONS -------- */

  const submit = async () => {
    const { valid, errors } = validateFields(
      preparedData,
      config.validation
    );

    if (!valid) {
      setErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      await onSave({
        ...preparedData,
        ...(Object.keys(fileUploads).length > 0 ? { _files: fileUploads } : {}),
        id: preparedData.id ?? crypto.randomUUID()
      });
    } finally {
      setSubmitting(false);
    }
  };

  const revert = () => {
    setData(originalData);
    setErrors({});
    setFileUploads({});
  };

  const handleCancel = () => {
    if (
      hasChanges &&
      !window.confirm("You have unsaved changes. Are you sure?")
    )
      return;
    onCancel();
  };

  /* -------- RENDER -------- */

  return (
    <div
      className={[
        styles.form,
        isSingleton && styles.singleton
      ].filter(Boolean).join(" ")}
    >
      {submitting && (
        <div className={styles.loadingOverlay}>
          <Loader />
        </div>
      )}

      {!isSingleton && (
        <h4 className={styles.title}>
          {isEditing ? "Edit " : "Add "}
          {config.label ?? "Item"}
        </h4>
      )}

      {config.fields.map(f => (
        <div key={f.name} className={styles.field}>
          <label>{f.label}</label>

          {/* TEXT */}
          {!f.type && (
            <input
              type="text"
              value={data[f.name] ?? ""}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

          {/* TEXTAREA */}
          {f.type === "textarea" && (
            <textarea
              value={data[f.name] ?? ""}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

          {/* BOOLEAN */}
          {f.type === "boolean" && (
            <input
              type="checkbox"
              checked={!!data[f.name]}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.checked })
              }
            />
          )}

          {/* SELECT */}
          {f.type === "select" && (
            <select
              value={data[f.name] ?? ""}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.value })
              }
            >
              <option value="">Select {f.label}</option>
              {f.options.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* DATE */}
          {f.type === "date" && (
            <input
              type="date"
              value={data[f.name] ?? ""}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

          {/* URL */}
          {f.type === "url" && (
            <input
              type="url"
              placeholder="https://example.com"
              value={data[f.name] ?? ""}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

          {/* FILE */}
          {f.type === "file" && (
            <>
              {data[f.name] && typeof data[f.name] === "string" && (
                <div className={styles.preview}>
                  <img
                    src={data[f.name]}
                    alt="Preview"
                    className={styles.previewImage}
                  />
                </div>
              )}
              <input
                type="file"
                accept={f.accept}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFileUploads(prev => ({
                    ...prev,
                    [f.name]: file
                  }));
                }}
              />
            </>
          )}

          {/* SPONSORS MULTISELECT */}
          {f.type === "multiSelect" && f.name === "sponsors" && (
            <div className={styles.multiSelect}>
              {sponsorsData?.map(sponsor => (
                <button
                  key={sponsor.id}
                  type="button"
                  className={
                    data.sponsors?.includes(sponsor.id)
                      ? styles.selected
                      : ""
                  }
                  onClick={() =>
                    setData(prev => {
                      const current = prev.sponsors || [];
                      return {
                        ...prev,
                        sponsors: current.includes(sponsor.id)
                          ? current.filter(id => id !== sponsor.id)
                          : [...current, sponsor.id]
                      };
                    })
                  }
                >
                  {sponsor.name}
                </button>
              ))}
            </div>
          )}

          {errors[f.name] && (
            <span className={styles.error}>
              Invalid {f.label}
            </span>
          )}
        </div>
      ))}

      {/* -------- NESTED (SCHEDULE) -------- */}
      {config.nested &&
        Object.entries(config.nested).map(([key, nested]) => {
          const items = data[key] || [];

          return (
            <div key={key} className={styles.field}>
              <label>{nested.label}</label>

              {items.map((item, index) => (
                <div key={index} className={styles.repeatableItem}>
                  <div className={styles.dayHeader}>
                    <label>Day {index + 1}</label>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
                        setData(prev => ({
                          ...prev,
                          [key]: prev[key].filter((_, i) => i !== index)
                        }))
                      }
                    >
                      Remove Day
                    </button>
                  </div>

                  {(item.events || []).map((event, i) => (
                    <div key={i} className={styles.repeatableSubItem}>
                      {nested.fields[1].fields.map(f => (
                        <div key={f.name}>
                          <label>{f.label}</label>
                          <input
                            type="text"
                            value={event[f.name] || ""}
                            onChange={e => {
                              const newData = structuredClone(data);
                              newData[key][index].events[i][f.name] =
                                e.target.value;
                              setData(newData);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  ))}

                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      const newData = structuredClone(data);
                      newData[key][index].events.push({});
                      setData(newData);
                    }}
                  >
                    Add Event
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="secondary"
                style={{marginTop: "15px"}}
                onClick={() =>
                  setData(prev => ({
                    ...prev,
                    [key]: [...prev[key], { events: [{}] }]
                  }))
                }
              >
                Add Day
              </button>
            </div>
          );
        })}

      {/* -------- BUTTONS -------- */}
      <div className={styles.buttons}>
        <button onClick={handleCancel} disabled={submitting}>Cancel</button>
        <button onClick={revert} disabled={!hasChanges || submitting}>
          Revert
        </button>
        <button onClick={submit} disabled={!hasChanges || submitting}>
          Save
        </button>
      </div>
    </div>
  );
}
