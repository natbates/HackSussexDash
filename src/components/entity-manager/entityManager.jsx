import { useState } from "react";
import useCrud from "../../hooks/useCrud.jsx";
import { useAuth } from "../../hooks/useAuth.jsx";
import EntityForm from "../entity-form/entityForm.jsx";
import styles from "./entityManager.module.css";
import LoadingScreen from "../misc/loading.jsx";

const PAGE_SIZE = 10;
const ROOT = "__root__";

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

export default function EntityManager({ config, refreshKey }) {
  const { token: jwtToken, logout } = useAuth();
  const { data, loading, addItem, updateItem, deleteItem, refetch, save } =
    useCrud(config?.file, refreshKey);

  const [currentAction, setCurrentAction] = useState(null); // { type: 'edit' | 'add', item?: ..., section?: ... }
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [visibleCount, setVisibleCount] = useState({});
  const [collapsed, setCollapsed] = useState(false); // whether the container is collapsed

  const processItemWithFiles = async (item, config, jwtToken) => {
    // always return a copy of the item; if there are files we upload them
    // first and replace the corresponding fields with URLs.
    const processed = { ...item };

    if (item._files && config?.imagePath) {
      for (const [field, file] of Object.entries(item._files)) {
        try {
          const ext = file.name.split(".").pop();
          const filename = crypto.randomUUID() + "." + ext;
          const path = `${config.imagePath}/${filename}`;
          const base64 = await toBase64(file);

          const res = await fetch("/.netlify/functions/upload-file", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${jwtToken}`,
            },
            body: JSON.stringify({ path, base64 }),
          });

          console.log("Upload response status:", res.status);

          if (res.status === 401) {
            logout();
            throw new Error("Session expired. Please log in again.");
          }

          const text = await res.text();
          let json;
          try {
            json = JSON.parse(text);
          } catch (e) {
            console.error("Upload response not JSON:", text);
            throw new Error(`Upload failed: ${res.status} ${res.statusText} - ${text}`);
          }

          if (!res.ok || json.error) {
            console.error("Upload failed:", json);
            throw new Error(json.error || "Upload failed");
          }

          processed[field] = json.url;
        } catch (err) {
          console.error("Failed to upload file for field", field, err);
          throw new Error(`Failed to upload file for field ${field}: ${err.message}`);
        }
      }

      // tidy up after all uploads
      delete processed._files;
    }

    return processed;
  };

  const matchesSearch = (item) => {
    if (!search) return true;
    if (!item) return false;

    const fields =
      config?.searchFields ??
      Object.keys(item).filter((k) => typeof item[k] === "string");

    return fields.some(
      (f) =>
        item[f]?.toString().toLowerCase().includes(search.toLowerCase())
    );
  };

  const matchesFilters = (item) => {
    if (!filters || !item) return true;

    return Object.entries(filters).every(([field, value]) => {
      if (value === "" || value === null || value === undefined) return true;
      return item[field] === value;
    });
  };

  const filterItems = (items = []) =>
    Array.isArray(items) ? items.filter((item) => matchesSearch(item) && matchesFilters(item)) : [];

  const filteredData = (() => {
    if (!config) return data;
    if (config.mode === "collection") return filterItems(data);
    if (config.mode === "sectioned") {
      const out = {};
      (config.sections ?? []).forEach((sec) => {
        out[sec.key] = filterItems(data?.[sec.key] ?? []);
      });
      return out;
    }
    return data;
  })();


  const getVisible = (items, key) => (items?.slice?.(0, visibleCount[key] ?? PAGE_SIZE) ?? []);
  const canShowMore = (items, key) => (visibleCount[key] ?? PAGE_SIZE) < (items?.length ?? 0);
  const canShowLess = (key) => (visibleCount[key] ?? PAGE_SIZE) > PAGE_SIZE;
  const showMore = (key) =>
    setVisibleCount((v) => ({ ...v, [key]: (v[key] ?? PAGE_SIZE) + PAGE_SIZE }));
  const showLess = (key) => setVisibleCount((v) => ({ ...v, [key]: PAGE_SIZE }));

  // helper to work out which section an item should live in when the
  // config uses the two standard event sections.  If the boolean
  // "past" field is present, we send to pastEvents when truthy,
  // otherwise upcomingEvents.  Returns undefined for other configs.
  const determineSection = (item) => {
    if (
      config?.sections?.length === 2 &&
      config.sections.some((s) => s.key === "pastEvents") &&
      config.sections.some((s) => s.key === "upcomingEvents")
    ) {
      return item?.past ? "pastEvents" : "upcomingEvents";
    }
    return undefined;
  };


  const renderRow = (item, section = null) => {
    if (!item) return null;

    if (currentAction?.type === 'edit' && currentAction.item?.id === item.id) {
      return (
        <div key={item.id} className={styles.row}>
          <EntityForm
            config={config}
            initialData={currentAction.item}
            onCancel={() => setCurrentAction(null)}
            onDirtyChange={setIsFormDirty}
            onSave={async (updated) => {
              try {
                const processed = await processItemWithFiles(updated, config, jwtToken);
                // figure out which section we should persist it under
                const newSection = determineSection(processed) ?? currentAction.item.section;

                // if the section changed we need to move the record manually;
                // updateItem only replaces within a single section and won't
                // remove the old copy for us.
                if (newSection !== currentAction.item.section) {
                  // build a fresh dataset by removing from old and adding to new
                  const updatedData = {
                    ...data,
                    [currentAction.item.section]: data[currentAction.item.section].filter(
                      (i) => i.id !== processed.id
                    ),
                    [newSection]: [...(data[newSection] || []), processed],
                  };
                  await save(updatedData);
                } else {
                  await updateItem(processed.id, processed, newSection);
                }
                setCurrentAction(null);
              } catch (err) {
                console.error("Failed to save edited item:", err);
              }
            }}
          />
        </div>
      );
    }

    return (
      <div key={item.id} className={styles.row}>
        <div className={styles.rowContainer}>
          <strong>{item.name ?? item.title ?? "Untitled"}</strong>
          <span className={styles.line}></span>
          <div className={styles.actions}>
            <button
              className="secondary"
              onClick={() => {
                if (currentAction && isFormDirty && !confirm("You have unsaved changes in the current form. Do you want to discard them?")) return;
                // include the `past` flag so the form checkbox is accurate
                setCurrentAction({ type: 'edit', item: { ...item, section, past: section === 'pastEvents' } });
              }}
            >
              Edit
            </button>
            <button onClick={() => deleteItem(item.id, section)}>Delete</button>
          </div>
        </div>
      </div>
    );
  };


  const renderControls = () => {
    if (!config || config.mode === "singleton") return null;

    return (
      <div className={styles.controls}>
        {config.mode !== "singleton" && (
          <div className={styles.searchContainer}>
            <input
              className={styles.search}
              placeholder="Search…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setVisibleCount({});
              }}
            />
            <button
              onClick={() => {
                setSearch("");
                setFilters({});
                setVisibleCount({});
              }}
            >
              Clear
            </button>
          </div>
        )}

        {(config.filters ?? []).map((filter) => (
          <select
            className="secondary"
            key={filter.field}
            value={
              filters[filter.field] === true
                ? "true"
                : filters[filter.field] === false
                ? "false"
                : filters[filter.field] ?? ""
            }
            onChange={(e) => {
              let val = e.target.value;
              if (filter.field === "pastCommittee") val = val === "true";
              setFilters((f) => ({ ...f, [filter.field]: val }));
              setVisibleCount({});
            }}
          >
            <option value="">All {filter.label}</option>
            {(filter.options ?? []).map((opt) => {
              const value = typeof opt === "boolean" ? String(opt) : opt ?? "";
              const display = typeof opt === "boolean" ? (opt ? "Yes" : "No") : String(opt);
              return (
                <option key={value} value={value}>
                  {display}
                </option>
              );
            })}
          </select>
        ))}

        {config.mode === "collection" && <button onClick={() => {
          if (currentAction && isFormDirty && !confirm("You have unsaved changes in the current form. Do you want to discard them?")) return;
          setCurrentAction({ type: 'add', section: ROOT });
        }}>+ Add</button>}
      </div>
    );
  };

  const renderHeader = () => (
    <div className={styles.header}>
      <h2 className={styles.title}>{config.label || "Item"}</h2>
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand" : "Collapse"}
      >
        {collapsed ? "▼" : "▲"}
      </button>
    </div>
  );

  if (config?.mode === "singleton") {
    return (
      <div className={styles.manager}>
        {renderHeader()}
        {!collapsed && (
          <>
            {renderControls()}
            <EntityForm
              config={config}
              initialData={data}
              onCancel={() => {}}
              onSave={async (updated) => {
                try {
                  const processed = await processItemWithFiles(updated, config, jwtToken);
                  await updateItem(null, processed);
                } catch (err) {
                  console.error("Failed to save singleton item:", err);
                }
              }}
            />
          </>
        )}
      </div>
    );
  }

  if (config?.mode === "collection") {
    const items = filteredData ?? [];
    const visible = getVisible(items, ROOT);

    return (
      <div className={styles.manager}>
        {renderHeader()}
        {!collapsed && (
          <>
            {renderControls()}

            {currentAction?.type === 'add' && currentAction.section === ROOT && (
              <EntityForm
                config={config}
                onCancel={() => setCurrentAction(null)}
                onDirtyChange={setIsFormDirty}
                onSave={async (item) => {
                  try {
                    const processed = await processItemWithFiles(item, config, jwtToken);
                    const targetSection = determineSection(processed);
                    if (targetSection) await addItem(processed, targetSection);
                    else await addItem(processed);
                    setCurrentAction(null);
                  } catch (err) {
                    console.error("Failed to add item:", err);
                  }
                }}
              />
            )}

            {visible.map((item) => renderRow(item))}

            {items.length > PAGE_SIZE && (
              <div className={styles.pagination}>
                <button onClick={() => showMore(ROOT)} disabled={!canShowMore(items, ROOT)}>
                  Show more
                </button>
                <button onClick={() => showLess(ROOT)} disabled={!canShowLess(ROOT)}>
                  Show less
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (config?.mode === "sectioned") {
    return (
      <div className={styles.manager}>
        {renderHeader()}
        {!collapsed && (
          <>
            {renderControls()}

            {(config.sections ?? []).map((sec) => {
              const items = filteredData[sec.key] ?? [];
              const visible = getVisible(items, sec.key);

              return (
                <div key={sec.key} className={styles.section}>
                  <div className={styles.sectionTop}>
                    <h3>{sec.label}</h3>
                    {!(currentAction?.type === 'add' && currentAction.section === sec.key) && (
                      <button onClick={() => {
                        if (currentAction && isFormDirty && !confirm("You have unsaved changes in the current form. Do you want to discard them?")) return;
                        setCurrentAction({ type: 'add', section: sec.key });
                      }}>+ Add</button>
                    )}
                  </div>

                  {currentAction?.type === 'add' && currentAction.section === sec.key && (
                    <div className={styles.sectionForm}>
                      <EntityForm
                        config={config}
                        onCancel={() => setCurrentAction(null)}
                        onDirtyChange={setIsFormDirty}
                        onSave={async (item) => {
                          try {
                            const processed = await processItemWithFiles(item, config, jwtToken);
                            // for event configuration we ignore the sec.key and use the
                            // checkbox to determine actual section
                            const targetSection = determineSection(processed) ?? sec.key;
                            await addItem(processed, targetSection);
                            setCurrentAction(null);
                          } catch (err) {
                            console.error(`Failed to add item in section ${sec.key}:`, err);
                          }
                        }}
                      />
                    </div>
                  )}

                  {visible.map((item) => renderRow(item, sec.key))}

                  {items.length > PAGE_SIZE && (
                    <div className={styles.pagination}>
                      <button onClick={() => showMore(sec.key)} disabled={!canShowMore(items, sec.key)}>
                        Show more
                      </button>
                      <button onClick={() => showLess(sec.key)} disabled={!canShowLess(sec.key)}>
                        Show less
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  return <p>Unsupported config mode</p>;
}
