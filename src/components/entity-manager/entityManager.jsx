import { useState } from "react";
import useCrud from "../../hooks/useCrud.jsx";
import { writeFile } from "../../util/githubWrite";
import useToken from "../../hooks/useToken";
import EntityForm from "../entity-form/entityForm.jsx";
import styles from "./entityManager.module.css";
import LoadingScreen from "../misc/loading.jsx";

const PAGE_SIZE = 10;
const ROOT = "__root__";

const toBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
});

const processItemWithFiles = async (item, config, token, repo) => {
  const processed = { ...item };
  if (item._files && config.imagePath) {
    for (const [field, file] of Object.entries(item._files)) {
      const ext = file.name.split('.').pop();
      const filename = crypto.randomUUID() + '.' + ext;
      const path = `${config.imagePath}/${filename}`;
      const base64 = await toBase64(file);
      const result = await writeFile(token, repo, path, base64);
      if (result.error) {
        throw new Error(`Failed to upload ${field}: ${result.error}`);
      }
      processed[field] = `https://raw.githubusercontent.com/${repo}/main/${path}`;
    }
  }
  delete processed._files;
  return processed;
};

export default function EntityManager({ config, refreshKey }) {
  const { data, loading, addItem, updateItem, deleteItem } =
    useCrud(config.file, refreshKey);
  const token = useToken();
  const repo = process.env.REACT_APP_GITHUB_REPO;

  const [editing, setEditing] = useState(null);
  const [addingKey, setAddingKey] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [visibleCount, setVisibleCount] = useState({});

  if (loading) return <LoadingScreen />;
  if (!data) return <p>No data</p>;

  const matchesSearch = (item) => {
    if (!search) return true;

    const fields =
      config.searchFields ??
      Object.keys(item).filter((k) => typeof item[k] === "string");

    return fields.some((f) =>
      item[f]?.toLowerCase().includes(search.toLowerCase())
    );
  };

  const matchesFilters = (item) =>
    Object.entries(filters).every(
      ([field, value]) => value === "" || item[field] === value
    );

  const filterItems = (items = []) =>
    items.filter(
      (item) => matchesSearch(item) && matchesFilters(item)
    );

  const filteredData = (() => {
    if (config.mode === "collection") {
      return filterItems(data);
    }
    if (config.mode === "sectioned") {
      const out = {};
      config.sections.forEach((sec) => {
        out[sec.key] = filterItems(data[sec.key] ?? []);
      });
      return out;
    }
    return data;
  })();

  const getVisible = (items, key) => {
    const count = visibleCount[key] ?? PAGE_SIZE;
    return items.slice(0, count);
  };

  const canShowMore = (items, key) =>
    (visibleCount[key] ?? PAGE_SIZE) < items.length;

  const canShowLess = (key) =>
    (visibleCount[key] ?? PAGE_SIZE) > PAGE_SIZE;

  const showMore = (key) =>
    setVisibleCount((v) => ({
      ...v,
      [key]: (v[key] ?? PAGE_SIZE) + PAGE_SIZE
    }));

  const showLess = (key) =>
    setVisibleCount((v) => ({
      ...v,
      [key]: PAGE_SIZE
    }));


  const renderRow = (item, section = null) => {
    if (editing?.id === item.id) {
      return (
        <div key={item.id} className={styles.row}>
          <EntityForm
            config={config}
            initialData={editing}
            onCancel={() => setEditing(null)}
            onSave={async (updated) => {
              const processed = await processItemWithFiles(updated, config, token, repo);
              updateItem(processed.id, processed, editing.section);
              setEditing(null);
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
            <button className="secondary" onClick={() => setEditing({ ...item, section })}>
              Edit
            </button>
            <button onClick={() => deleteItem(item.id, section)}>
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderControls = () => (
    <div className={styles.controls} style={config.mode === "singleton" ? {display: "none"} : {}}>
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
        <button onClick={() => {setSearch(""); setFilters({}); setVisibleCount({}); }}>Clear</button>
        </div>
      )}

      {config.filters?.map((filter) => (
        <select
          className="secondary"
          key={filter.field}
          value={filters[filter.field] ?? ""}
          onChange={(e) => {
            setFilters((f) => ({
              ...f,
              [filter.field]: e.target.value
            }));
            setVisibleCount({});
          }}
        >
          <option value="">All {filter.label}</option>
            {filter.options.map((opt) => {
              const value = typeof opt === "string" ? opt : opt?.name ?? "";
              return (
                <option key={value} value={value}>
                  {value}
                </option>
              );
            })}
        </select>
      ))}

      {config.mode === "collection" && <button onClick={() => setAddingKey(ROOT)}>+ Add</button>}
    </div>
  );

  if (config.mode === "singleton") {
    return (
      <div className={styles.manager}>
        {renderControls()}
        <EntityForm
          config={config}
          initialData={data}
          onCancel={() => {}}
          onSave={async (updated) => {
            const processed = await processItemWithFiles(updated, config, token, repo);
            updateItem(null, processed);
          }}
        />
      </div>
    );
  }

  if (config.mode === "collection") {
    const items = filteredData;
    const visible = getVisible(items, ROOT);

    return (
      <div className={styles.manager}>
        {renderControls()}

        {addingKey === ROOT && (
          <EntityForm
            config={config}
            onCancel={() => setAddingKey(null)}
            onSave={async (item) => {
              const processed = await processItemWithFiles(item, config, token, repo);
              addItem(processed);
              setAddingKey(null);
            }}
          />
        )}


        {visible.map((item) => renderRow(item))}

        {items.length > PAGE_SIZE && (
          <div className={styles.pagination}>
            <button
              onClick={() => showMore(ROOT)}
              disabled={!canShowMore(items, ROOT)}
            >
              Show more
            </button>
            <button
              onClick={() => showLess(ROOT)}
              disabled={!canShowLess(ROOT)}
            >
              Show less
            </button>
          </div>
        )}
      </div>
    );
  }

  if (config.mode === "sectioned") {
    return (
      <div className={styles.manager}>
        {renderControls()}

        {config.sections.map((sec) => {
          const items = filteredData[sec.key] ?? [];
          const visible = getVisible(items, sec.key);

          return (
            <div key={sec.key} className={styles.section}>
              
              <div className={styles.sectionTop}>
                <h3>{sec.label}</h3>

                {addingKey === sec.key ? (
                  <EntityForm
                    config={config}
                    onCancel={() => setAddingKey(null)}
                    onSave={async (item) => {
                      const processed = await processItemWithFiles(item, config, token, repo);
                      addItem(processed, sec.key);
                      setAddingKey(null);
                    }}
                  />
                ) :

                <button onClick={() => setAddingKey(sec.key)}>
                  + Add
                </button>
                }
              </div>

              {visible.map((item) =>
                renderRow(item, sec.key)
              )}

              {items.length > PAGE_SIZE && (
                <div className={styles.pagination}>
                  <button
                    onClick={() => showMore(sec.key)}
                    disabled={!canShowMore(items, sec.key)}
                  >
                    Show more
                  </button>
                  <button
                    onClick={() => showLess(sec.key)}
                    disabled={!canShowLess(sec.key)}
                  >
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
