import { useState, useMemo } from "react";
import { validateFields } from "../../util/validators";
import styles from "./entityForm.module.css";

export default function EntityForm({
  config,
  initialData = {},
  onSave,
  onCancel
}) {
  const [data, setData] = useState(() => {
    const defaults = {};
    config.fields.forEach(f => {
      if (f.type === 'boolean') defaults[f.name] = false;
      else if (f.type === 'array' || f.parse === 'csv') defaults[f.name] = [];
      else defaults[f.name] = '';
    });
    if (config.nested) {
      Object.entries(config.nested).forEach(([key, nested]) => {
        if (nested.type === 'repeatable') defaults[key] = [];
      });
    }
    return { ...defaults, ...initialData };
  });
  const [originalData] = useState(() => {
    const defaults = {};
    config.fields.forEach(f => {
      if (f.type === 'boolean') defaults[f.name] = false;
      else if (f.type === 'array' || f.parse === 'csv') defaults[f.name] = [];
      else defaults[f.name] = '';
    });
    if (config.nested) {
      Object.entries(config.nested).forEach(([key, nested]) => {
        if (nested.type === 'repeatable') defaults[key] = [];
      });
    }
    return { ...defaults, ...initialData };
  });
  const [errors, setErrors] = useState({});
  const [fileUploads, setFileUploads] = useState({});

  const isEditing = Boolean(initialData?.id);
  const isSingleton = config.mode === "singleton";

  /* ---------------- PREPARE DATA ---------------- */

  const preparedData = useMemo(() => {
    const out = { ...data };

    config.fields?.forEach((f) => {
      if (f.parse === "csv" && typeof out[f.name] === "string") {
        out[f.name] = out[f.name]
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      }
    });

    return out;
  }, [data, config.fields]);

  const hasChanges =
    JSON.stringify(preparedData) !== JSON.stringify(originalData) ||
    Object.keys(fileUploads).length > 0;

  /* ---------------- ACTIONS ---------------- */

  const submit = () => {
    const { valid, errors } = validateFields(
      preparedData,
      config.validation
    );

    if (!valid) {
      setErrors(errors);
      return;
    }

    onSave({
      ...preparedData,
      ...(Object.keys(fileUploads).length > 0 ? { _files: fileUploads } : {}),
      id: preparedData.id ?? crypto.randomUUID()
    });
  };

  const revert = () => {
    setData(originalData);
    setErrors({});
    setFileUploads({});
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to cancel?")) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return (
    <div
      className={[
        styles.form,
        isSingleton && styles.singleton
      ].filter(Boolean).join(" ")}
    >
      {!isSingleton && (
        <h4 className={styles.title}>
          {isEditing
            ? "Edit " + (config.label ?? "Item")
            : "Add " + (config.label ?? "Item")}
        </h4>
      )}

      {config.fields.map((f) => (
        <div key={f.name} className={styles.field}>
          <label>{f.label}</label>

          {/* TEXTAREA */}
          {f.type === "textarea" && (
            <textarea
              value={data[f.name] ?? ""}
              onChange={(e) =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

          {/* BOOLEAN */}
          {f.type === "boolean" && (
            <input
              type="checkbox"
              checked={!!data[f.name]}
              onChange={(e) =>
                setData({ ...data, [f.name]: e.target.checked })
              }
            />
          )}

          {/* SELECT */}
          {f.type === "select" && (
            <select
              value={data[f.name] ?? ""}
              onChange={(e) =>
                setData({ ...data, [f.name]: e.target.value })
              }
            >
              <option value="">Select {f.label}</option>
              {f.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {/* FILE */}
          {f.type === "file" && (
            <>
              {data[f.name] && typeof data[f.name] === "string" && data[f.name].trim() && (
                <div className={styles.preview}>
                  <img src = {data[f.name]} alt="Preview" className={styles.previewImage} />
                </div>
              )}

              <input
                type="file"
                accept={f.accept}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setFileUploads((prev) => ({
                    ...prev,
                    [f.name]: file
                  }));
                }}
              />
            </>
          )}

          {/* DEFAULT */}
          {!f.type && (
            <input
              type="text"
              placeholder={f.placeholder}
              value={data[f.name] ?? ""}
              onChange={(e) =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

          {/* OTHER TYPES */}
          {f.type &&
            !["textarea", "boolean", "select", "file"].includes(f.type) && (
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={data[f.name] ?? ""}
                onChange={(e) =>
                  setData({ ...data, [f.name]: e.target.value })
                }
              />
            )}

          {errors[f.name] && (
            <span className={styles.error}>
              Invalid {f.label}
            </span>
          )}
        </div>
      ))}

      {config.nested && Object.entries(config.nested).map(([key, nestedConfig]) => {
        const items = data[key] || [];
        return (
          <div key={key} className={styles.field}>
            <label>{nestedConfig.label}</label>
            {items.map((item, index) => (
              <div key={index} className={styles.repeatableItem}>
                <div className={styles.dayHeader}>
                  <label>Day {index + 1}</label>
                  <div className={styles.dayActions}>
                    <button type="button" onClick={() => {
                      setData(prev => {
                        const newData = JSON.parse(JSON.stringify(prev));
                        newData[key][index].events = [...newData[key][index].events, {}];
                        return newData;
                      });
                    }} disabled={(item.events || []).length >= 12}>Add Event</button>
                    <button type="button" onClick={() => {
                      setData(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
                    }}>Remove Day</button>
                  </div>
                </div>
                {nestedConfig.fields.map(subF => {
                  if (subF.name === 'day') {
                    return (
                      <div key={subF.name} className={styles.subField}>
                      </div>
                    );
                  }
                  if (subF.type === 'repeatable') {
                    const subItems = item[subF.name] || [];
                    return (
                      <div key={subF.name} className={styles.subField}>
                        {/* <label>{subF.label}</label> */}
                        {subItems.map((subItem, subIndex) => (
                          <div key={subIndex} className={styles.repeatableSubItem}>
                            {subF.fields.map(subSubF => (
                              <div key={subSubF.name} className={styles.subSubField}>
                                <label>{subSubF.label}</label>
                                {subSubF.type === 'textarea' ? (
                                  <textarea
                                    value={subItem[subSubF.name] || ''}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      setData(prev => {
                                        const newData = JSON.parse(JSON.stringify(prev));
                                        newData[key][index][subF.name][subIndex][subSubF.name] = newValue;
                                        return newData;
                                      });
                                    }}
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    value={subItem[subSubF.name] || ''}
                                    onChange={(e) => {
                                      const newValue = e.target.value;
                                      setData(prev => {
                                        const newData = JSON.parse(JSON.stringify(prev));
                                        newData[key][index][subF.name][subIndex][subSubF.name] = newValue;
                                        return newData;
                                      });
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                            {subIndex > 0 && (
                              <button type="button" onClick={() => {
                                setData(prev => {
                                  const newData = JSON.parse(JSON.stringify(prev));
                                  newData[key][index][subF.name] = newData[key][index][subF.name].filter((_, i) => i !== subIndex);
                                  return newData;
                                });
                              }}>Remove Event</button>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div key={subF.name} className={styles.subField}>
                        <label>{subF.label}</label>
                        {subF.type === 'textarea' ? (
                          <textarea
                            value={item[subF.name] || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setData(prev => {
                                const newData = JSON.parse(JSON.stringify(prev));
                                newData[key][index][subF.name] = newValue;
                                return newData;
                              });
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={item[subF.name] || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setData(prev => {
                                const newData = JSON.parse(JSON.stringify(prev));
                                newData[key][index][subF.name] = newValue;
                                return newData;
                              });
                            }}
                          />
                        )}
                      </div>
                    );
                  }
                })}
              </div>
            ))}
            <button
              type="button"
              className={styles.addDayButton}
              onClick={() => {
                setData(prev => ({ ...prev, [key]: [...prev[key], { events: [{}] }] }));
              }}
              disabled={items.length >= (nestedConfig.max || Infinity)}
            >
              Add Day
            </button>
          </div>
        );
      })}

      <div className={styles.buttons}>
        {isSingleton && (
          <>
            <button type="button" onClick={revert} disabled={!hasChanges}>
              Revert
            </button>

            <button type="button" onClick={submit} disabled={!hasChanges}>
              Save
            </button>
          </>
        )}

        {!isSingleton && isEditing && (
          <>
            <button type="button" onClick={handleCancel}>
              Cancel
            </button>

            <button
              type="button"
              onClick={revert}
              disabled={!hasChanges}
            >
              Revert
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={!hasChanges}
            >
              Save changes
            </button>
          </>
        )}

        {/* ADDING */}
        {!isSingleton && !isEditing && (
          <>
            <button type="button" onClick={handleCancel}>
              Cancel
            </button>

            <button type="button" onClick={submit}>
              Add
            </button>
          </>
        )}
      </div>
    </div>
  );
}
