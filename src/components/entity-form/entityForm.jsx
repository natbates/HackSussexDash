import { useState, useMemo, useEffect } from "react";
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
      ) {
        defaults[f.name] = [];
      } else if (f.type === "sponsorTiers") {
        // sponsorTiers is now an object with sponsor IDs as keys and tier as values
        defaults[f.name] = {};
      } else defaults[f.name] = "";
    });

    // Handle nested fields
    if (config.nested) {
      Object.entries(config.nested).forEach(([key, nestedConfig]) => {
        if (nestedConfig.type === "repeatable") {
          defaults[key] = [];
        } else {
          defaults[key] = "";
        }
      });
    }

    return defaults;
  };

  const convertSponsorsFormat = (sponsors) => {
    if (!sponsors) return {};
    
    // If it's already in the new format (object with sponsor IDs as keys)
    if (typeof sponsors === 'object' && !Array.isArray(sponsors) && 
        Object.keys(sponsors).some(key => typeof sponsors[key] === 'string')) {
      return sponsors;
    }
    
    // Convert from old format (object with tier arrays) to new format
    const converted = {};
    if (sponsors.gold) sponsors.gold.forEach(id => converted[id] = 'gold');
    if (sponsors.silver) sponsors.silver.forEach(id => converted[id] = 'silver');
    if (sponsors.bronze) sponsors.bronze.forEach(id => converted[id] = 'bronze');
    if (sponsors.partner) sponsors.partner.forEach(id => converted[id] = 'partner');
    return converted;
  };

  const [data, setData] = useState(() => {
    const defaults = buildDefaults();
    const merged = { ...defaults, ...initialData };
    
    // Convert sponsors format if needed
    if (merged.sponsors) {
      merged.sponsors = convertSponsorsFormat(merged.sponsors);
    }
    
    return merged;
  });

  const [originalData] = useState(() => {
    const defaults = buildDefaults();
    const merged = { ...defaults, ...initialData };
    
    // Convert sponsors format if needed
    if (merged.sponsors) {
      merged.sponsors = convertSponsorsFormat(merged.sponsors);
    }
    
    return merged;
  });

  const [errors, setErrors] = useState({});
  const [fileUploads, setFileUploads] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(initialData?.id);
  const isSingleton = config.mode === "singleton";

  const hasSponsorsField = config.fields?.some(
    f => f.name === "sponsors" && (f.type === "multiSelect" || f.type === "sponsorTiers")
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

  // Prevent accidental navigation away with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers show this message
      }
    };

    if (hasChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  const submit = async () => {
    const { valid, errors: validationErrors } = validateFields(preparedData, config.validation);

    const requiredErrors = {};
    config.fields.forEach(f => {
      if (!f.required) return;

      const value = preparedData[f.name];

      if (f.type === "file") {
        if (!fileUploads[f.name] && (!value || value === "")) {
          requiredErrors[f.name] = `${f.label} is required`;
        }
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          requiredErrors[f.name] = `${f.label} is required`;
        }
      } else if (value === undefined || value === null || value === "") {
        requiredErrors[f.name] = `${f.label} is required`;
      }
    });

    const combinedErrors = { ...validationErrors, ...requiredErrors };

    if (Object.keys(combinedErrors).length > 0) {
      setErrors(combinedErrors);
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

  const canSave = () => {
    return config.fields.every(f => {
      if (!f.required) return true;

      const value = preparedData[f.name];

      if (f.type === "file") {
        return !!fileUploads[f.name] || (value && value !== "");
      }

      return (
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
      );
    }) && hasChanges;
  };


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
          <label>
            {f.label} {f.required && <span className={styles.required}>*</span>}
          </label>

          {!f.type && (
            <input
              type="text"
              value={data[f.name] ?? ""}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

          {f.type === "textarea" && (
            <textarea
              value={data[f.name] ?? ""}
              rows={config.label?.toLowerCase().includes('event') && f.name === 'description' ? 8 : undefined}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

          {f.type === "boolean" && (
            <input
              type="checkbox"
              checked={!!data[f.name]}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.checked })
              }
            />
          )}

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

          {f.type === "date" && (
            <input
              type="date"
              value={data[f.name] ?? ""}
              onChange={e =>
                setData({ ...data, [f.name]: e.target.value })
              }
            />
          )}

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
                accept="image/*"
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

          {f.type === "sponsorTiers" && (
            <div className={styles.sponsorTiers}>
              <div className={styles.legend}>
                <span>Click to cycle sponsor tiers:</span>
                <div className={styles.tierLegend}>
                  <span className={styles.gold}>Gold</span>
                  <span className={styles.silver}>Silver</span>
                  <span className={styles.bronze}>Bronze</span>
                  <span className={styles.partner}>Partner</span>
                </div>
              </div>
              <div className={styles.multiSelect}>
                {sponsorsData?.map(sponsor => {
                  const currentTier = data.sponsors?.[sponsor.id] || "";
                  const tiers = ["", "gold", "silver", "bronze", "partner"];
                  const currentIndex = tiers.indexOf(currentTier);
                  const nextTier = tiers[(currentIndex + 1) % tiers.length];
                  
                  return (
                    <button
                      key={sponsor.id}
                      type="button"
                      className={`${styles.tierButton} ${styles[currentTier] || ""}`}
                      onClick={() =>
                        setData(prev => ({
                          ...prev,
                          sponsors: {
                            ...prev.sponsors,
                            [sponsor.id]: nextTier
                          }
                        }))
                      }
                    >
                      {sponsor.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errors[f.name] && (
            <span className={styles.error}>{errors[f.name]}</span>
          )}
        </div>
      ))}

      {config.nested && Object.entries(config.nested).map(([key, nestedConfig]) => (
        <div key={key} className={styles.field}>
          <label>
            {nestedConfig.label} {nestedConfig.required && <span className={styles.required}>*</span>}
          </label>
          
          {nestedConfig.type === "repeatable" && (
            <div className={styles.repeatableContainer}>
              {(data[key] || []).map((item, index) => (
                <div key={index} className={styles.repeatableItem}>
                  <div className={styles.repeatableHeader}>
                    <strong>{nestedConfig.label} {index + 1}</strong>
                    <button
                      type="button"
                      onClick={() => {
                        setData(prev => ({
                          ...prev,
                          [key]: prev[key].filter((_, i) => i !== index)
                        }));
                      }}
                      className={styles.removeBtn}
                    >
                      Remove
                    </button>
                  </div>
                  
                  {nestedConfig.fields.map(subField => (
                    <div key={subField.name} className={styles.subField}>
                      <label>
                        {subField.label} {subField.required && <span className={styles.required}>*</span>}
                      </label>
                      
                      {subField.type === "repeatable" ? (
                        <div className={styles.repeatableSubContainer}>
                          {(item[subField.name] || []).map((subItem, subIndex) => (
                            <div key={subIndex} className={styles.repeatableSubItem}>
                              <div className={styles.repeatableSubHeader}>
                                <strong>{subField.label} {subIndex + 1}</strong>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setData(prev => {
                                      const newData = { ...prev };
                                      const parentArray = [...(newData[key] || [])];
                                      const currentItem = { ...parentArray[index] };
                                      currentItem[subField.name] = currentItem[subField.name].filter((_, i) => i !== subIndex);
                                      parentArray[index] = currentItem;
                                      newData[key] = parentArray;
                                      return newData;
                                    });
                                  }}
                                  className={styles.removeBtn}
                                >
                                  Remove
                                </button>
                              </div>
                              
                              {subField.fields.map(subSubField => (
                                <div key={subSubField.name}>
                                  <label>
                                    {subSubField.label} {subSubField.required && <span className={styles.required}>*</span>}
                                  </label>
                                  
                                  {!subSubField.type && (
                                    <input
                                      type="text"
                                      value={subItem[subSubField.name] || ""}
                                      onChange={e => {
                                        setData(prev => {
                                          const newData = { ...prev };
                                          const parentArray = [...(newData[key] || [])];
                                          const currentItem = { ...parentArray[index] };
                                          const subArray = [...(currentItem[subField.name] || [])];
                                          subArray[subIndex] = { ...subArray[subIndex], [subSubField.name]: e.target.value };
                                          currentItem[subField.name] = subArray;
                                          parentArray[index] = currentItem;
                                          newData[key] = parentArray;
                                          return newData;
                                        });
                                      }}
                                    />
                                  )}
                                  
                                  {subSubField.type === "textarea" && (
                                    <textarea
                                      value={subItem[subSubField.name] || ""}
                                      onChange={e => {
                                        setData(prev => {
                                          const newData = { ...prev };
                                          const parentArray = [...(newData[key] || [])];
                                          const currentItem = { ...parentArray[index] };
                                          const subArray = [...(currentItem[subField.name] || [])];
                                          subArray[subIndex] = { ...subArray[subIndex], [subSubField.name]: e.target.value };
                                          currentItem[subField.name] = subArray;
                                          parentArray[index] = currentItem;
                                          newData[key] = parentArray;
                                          return newData;
                                        });
                                      }}
                                    />
                                  )}
                                </div>
                              ))}
                              
                              <button
                                type="button"
                                onClick={() => {
                                  setData(prev => {
                                    const newData = { ...prev };
                                    const parentArray = [...(newData[key] || [])];
                                    const currentItem = { ...parentArray[index] };
                                    const subArray = [...(currentItem[subField.name] || [])];
                                    const newSubItem = {};
                                    subField.fields.forEach(f => {
                                      if (f.type === "boolean") newSubItem[f.name] = false;
                                      else if (f.type === "array") newSubItem[f.name] = [];
                                      else newSubItem[f.name] = "";
                                    });
                                    subArray.splice(subIndex + 1, 0, newSubItem);
                                    currentItem[subField.name] = subArray;
                                    parentArray[index] = currentItem;
                                    newData[key] = parentArray;
                                    return newData;
                                  });
                                }}
                                className={styles.addBtn}
                              >
                                Add {subField.label.slice(0, -1)} After
                              </button>
                            </div>
                          ))}
                          
                          <button
                            type="button"
                            onClick={() => {
                              setData(prev => {
                                const newData = { ...prev };
                                const parentArray = [...(newData[key] || [])];
                                const currentItem = { ...parentArray[index] };
                                const subArray = [...(currentItem[subField.name] || [])];
                                const newSubItem = {};
                                subField.fields.forEach(f => {
                                  if (f.type === "boolean") newSubItem[f.name] = false;
                                  else if (f.type === "array") newSubItem[f.name] = [];
                                  else newSubItem[f.name] = "";
                                });
                                subArray.push(newSubItem);
                                currentItem[subField.name] = subArray;
                                parentArray[index] = currentItem;
                                newData[key] = parentArray;
                                return newData;
                              });
                            }}
                            className={styles.addBtn}
                          >
                            Add {subField.label.slice(0, -1)}
                          </button>
                        </div>
                      ) : (
                        <>
                          {!subField.type && (
                            <input
                              type="text"
                              value={item[subField.name] || ""}
                              onChange={e => {
                                setData(prev => {
                                  const newData = { ...prev };
                                  const parentArray = [...(newData[key] || [])];
                                  parentArray[index] = { ...parentArray[index], [subField.name]: e.target.value };
                                  newData[key] = parentArray;
                                  return newData;
                                });
                              }}
                            />
                          )}
                          
                          {subField.type === "textarea" && (
                            <textarea
                              value={item[subField.name] || ""}
                              onChange={e => {
                                setData(prev => {
                                  const newData = { ...prev };
                                  const parentArray = [...(newData[key] || [])];
                                  parentArray[index] = { ...parentArray[index], [subField.name]: e.target.value };
                                  newData[key] = parentArray;
                                  return newData;
                                });
                              }}
                            />
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => {
                      setData(prev => {
                        const newData = { ...prev };
                        const parentArray = [...(newData[key] || [])];
                        const newItem = {};
                        nestedConfig.fields.forEach(f => {
                          if (f.type === "boolean") newItem[f.name] = false;
                          else if (f.type === "array") newItem[f.name] = [];
                          else if (f.type === "repeatable") newItem[f.name] = [];
                          else newItem[f.name] = "";
                        });
                        parentArray.splice(index + 1, 0, newItem);
                        newData[key] = parentArray;
                        return newData;
                      });
                    }}
                    className={styles.addBtn}
                  >
                    Add {nestedConfig.label.slice(0, -1)} After
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setData(prev => {
                    const newData = { ...prev };
                    const parentArray = [...(newData[key] || [])];
                    const newItem = {};
                    nestedConfig.fields.forEach(f => {
                      if (f.type === "boolean") newItem[f.name] = false;
                      else if (f.type === "array") newItem[f.name] = [];
                      else if (f.type === "repeatable") newItem[f.name] = [];
                      else newItem[f.name] = "";
                    });
                    parentArray.push(newItem);
                    newData[key] = parentArray;
                    return newData;
                  });
                }}
                className={styles.addBtn}
              >
                Add {nestedConfig.label.slice(0, -1)}
              </button>
            </div>
          )}
        </div>
      ))}

      <div className={styles.buttons}>
        {(!isSingleton) && (
          <button onClick={handleCancel} disabled={submitting}>Cancel</button>
        )}
        {(isEditing || isSingleton) && (
          <button onClick={revert} disabled={!hasChanges || submitting}>
            Revert
          </button>
        )}
        <button
          onClick={submit}
          disabled={!canSave() || submitting}
        >
          {isEditing ? "Save" : "Create"}
        </button>
      </div>
    </div>
  );
}
