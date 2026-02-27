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

const processItemWithFiles = async (item, config, jwtToken) => {
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

        const json = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error || "Upload failed");
        }

        processed[field] = json.url; 
      } catch (err) {
        console.error(`Error processing file ${field}`, err);
        throw err;
      }
    }
  }

  delete processed._files;
  return processed;
};

export default function EntityManager({ config, refreshKey }) {
  const { token: jwtToken } = useAuth();
  const { data, loading, addItem, updateItem, deleteItem, refetch } =
    useCrud(config?.file, refreshKey);

  const [editing, setEditing] = useState(null);
  const [addingKey, setAddingKey] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [visibleCount, setVisibleCount] = useState({});

  if (loading) return <LoadingScreen message="Loading entities..." />;
  if (!data) return <p>No data found.</p>;


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
        out[sec.key] = filterItems(data[sec.key] ?? []);
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

  const moveItem = async (item, fromSection, toSection) => {
    try {
      // Remove from current section first
      await deleteItem(item.id, fromSection);
      // Then add to new section
      await addItem(item, toSection);
    } catch (err) {
      console.error("Failed to move item:", err);
      // Revert on error by refetching
      refetch();
    }
  };


  const renderRow = (item, section = null) => {
    if (!item) return null;

    if (editing?.id === item.id) {
      return (
        <div key={item.id} className={styles.row}>
          <EntityForm
            config={config}
            initialData={editing}
            onCancel={() => setEditing(null)}
            onSave={async (updated) => {
              try {
                const processed = await processItemWithFiles(updated, config, jwtToken);
                await updateItem(processed.id, processed, editing.section);
                setEditing(null);
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
            {config.label?.toLowerCase().includes('event') && section === 'pastEvents' && (
              <button 
                className="secondary"
                onClick={() => moveItem(item, 'pastEvents', 'upcomingEvents')}
              >
                Move to Upcoming
              </button>
            )}
            {config.label?.toLowerCase().includes('event') && section === 'upcomingEvents' && (
              <button 
                className="secondary"
                onClick={() => moveItem(item, 'upcomingEvents', 'pastEvents')}
              >
                Move to Past
              </button>
            )}
            <button
              className="secondary"
              onClick={() => setEditing({ ...item, section })}
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

        {config.mode === "collection" && <button onClick={() => setAddingKey(ROOT)}>+ Add</button>}
      </div>
    );
  };

  if (config?.mode === "singleton") {
    return (
      <div className={styles.manager}>
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
      </div>
    );
  }

  if (config?.mode === "collection") {
    const items = filteredData ?? [];
    const visible = getVisible(items, ROOT);

    return (
      <div className={styles.manager}>
        {renderControls()}

        {addingKey === ROOT && (
          <EntityForm
            config={config}
            onCancel={() => setAddingKey(null)}
            onSave={async (item) => {
              try {
                const processed = await processItemWithFiles(item, config, jwtToken);
                await addItem(processed);
                setAddingKey(null);
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
      </div>
    );
  }

  if (config?.mode === "sectioned") {
    return (
      <div className={styles.manager}>
        {renderControls()}

        {(config.sections ?? []).map((sec) => {
          const items = filteredData[sec.key] ?? [];
          const visible = getVisible(items, sec.key);

          return (
            <div key={sec.key} className={styles.section}>
              <div className={styles.sectionTop}>
                <h3>{sec.label}</h3>
                {addingKey !== sec.key && (
                  <button onClick={() => setAddingKey(sec.key)}>+ Add</button>
                )}
              </div>

              {addingKey === sec.key && (
                <div className={styles.sectionForm}>
                  <EntityForm
                    config={config}
                    onCancel={() => setAddingKey(null)}
                    onSave={async (item) => {
                      try {
                        const processed = await processItemWithFiles(item, config, jwtToken);
                        await addItem(processed, sec.key);
                        setAddingKey(null);
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
      </div>
    );
  }

  return <p>Unsupported config mode</p>;
}
