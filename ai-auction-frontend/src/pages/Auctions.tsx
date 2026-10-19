import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import VehicleCard from "../components/VehicleCard";
import Filters from "../components/Filters";
import { SkeletonCard, NoVehicles } from "../components/Loader";
import { RefreshCcw, AlertTriangle } from "lucide-react";

interface Vehicle {
  _id: string;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  engine: number;
  max_power: number;
  seats: number;
  fuel: string;
  transmission: string;
  vehicle_age: number;
  images?: { url: string }[];
}

// 9. Custom Debounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function Auctions() {
  const [searchParams] = useSearchParams();
  const rawSearchQuery = searchParams.get("q") || "";

  // States
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Filter States
  const [yearFilter, setYearFilter] = useState("");
  const [mileageFilter, setMileageFilter] = useState("");
  const [sortBy, setSortBy] = useState("latest");

  // Debounce API Triggers
  const debouncedSearch = useDebounce(rawSearchQuery, 300);
  const debouncedYear = useDebounce(yearFilter, 300);
  const debouncedMileage = useDebounce(mileageFilter, 300);
  const debouncedSort = useDebounce(sortBy, 300);

  // Refs for request cancellation
  const cancelTokenSource = useRef<AbortController | null>(null);

  // 3. Robust Retry Wrapper using Fetch
  const fetchWithRetry = async (url: string, retries = 2): Promise<any> => {
    try {
      if (cancelTokenSource.current) {
        cancelTokenSource.current.abort();
      }
      const controller = new AbortController();
      cancelTokenSource.current = controller;

      const response = await fetch(`http://localhost:5000${url}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return { data: await response.json() };
    } catch (err: any) {
      if (err.name === "AbortError") throw err; // Ignore manual cancels

      if (retries > 0) {
        console.warn(
          `Connection failed. Retrying... (${retries} attempts left)`,
        );
        await new Promise((res) => setTimeout(res, 1000)); // 1s exponential wait
        return fetchWithRetry(url, retries - 1);
      }
      throw err; // Out of retries
    }
  };

  const loadVehicles = useCallback(
    async (isLoadMore = false) => {
      try {
        if (!isLoadMore) {
          setLoading(true);
          setError(null);
        } else {
          setIsFetchingMore(true);
        }

        // Build Query Params map
        const params = new URLSearchParams({
          limit: "20",
          page: isLoadMore ? (page + 1).toString() : "1",
        });

        if (debouncedSearch) params.append("search", debouncedSearch);
        if (debouncedYear) params.append("year", debouncedYear);
        if (debouncedSort) params.append("sortBy", debouncedSort);

        if (debouncedMileage) {
          if (debouncedMileage === "0-50000") {
            params.append("minMileage", "0");
            params.append("maxMileage", "50000");
          } else if (debouncedMileage === "50000-100000") {
            params.append("minMileage", "50001");
            params.append("maxMileage", "100000");
          } else if (debouncedMileage === "100000-150000") {
            params.append("minMileage", "100001");
            params.append("maxMileage", "150000");
          } else if (debouncedMileage === "150000+") {
            params.append("minMileage", "150001");
          }
        }

        const res = await fetchWithRetry(`/api/vehicles?${params.toString()}`);

        const payloadVehicles = res.data.vehicles || [];
        const payloadTotal = res.data.total || 0;

        const formattedData = Array.isArray(payloadVehicles)
          ? payloadVehicles.map((v: any) => ({
              ...v,
              images: Array.isArray(v.images)
                ? v.images.map((img: any) =>
                    typeof img === "string" ? { url: img } : img,
                  )
                : [],
            }))
          : [];

        if (isLoadMore) {
          setVehicles((prev) => {
            const existingIds = new Set(prev.map((p) => p._id));
            const newUnique = formattedData.filter(
              (d: any) => !existingIds.has(d._id),
            );
            return [...prev, ...newUnique];
          });
          setPage((prev) => prev + 1);
        } else {
          setVehicles(formattedData);
          setPage(1);
        }

        setTotalVehicles(payloadTotal);
        setHasMore(formattedData.length === 20); // If it returned 20, there are likely more
        setError(null);
      } catch (err: any) {
        if (err.name === "AbortError") return; // Don't error out on rapid typing cancellation

        // 7. Fallback error UI without destroying existing cached data.
        setError(
          err.code === "ECONNABORTED"
            ? "Connection timed out. The server took too long to respond."
            : "Failed to load vehicles from the database.",
        );
      } finally {
        if (!isLoadMore) setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [debouncedSearch, debouncedYear, debouncedMileage, debouncedSort, page],
  );

  // Initial & Filter change trigger
  useEffect(() => {
    setPage(1); // Reset pagination on any filter shift
    loadVehicles(false);
    return () => {
      if (cancelTokenSource.current) {
        cancelTokenSource.current.abort();
      }
    };
  }, [debouncedSearch, debouncedYear, debouncedMileage, debouncedSort]);

  // Improved Error UI Component
  const ErrorStateUI = () => (
    <div
      className="flex flex-col items-center justify-center py-16 rounded-3xl backdrop-blur-sm shadow-2xl mx-auto my-12 text-center max-w-2xl px-6"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid rgba(239,68,68,0.25)" }}
    >
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20 shadow-inner">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-2xl font-bold tracking-tight mb-3" style={{ color: "var(--text-primary)" }}>
        Connection Interrupted
      </h3>
      <p className="mb-8 max-w-md" style={{ color: "var(--text-secondary)" }}>
        {error} We attempted to reconnect 3 times automatically but failed.
      </p>
      <button
        onClick={() => loadVehicles(false)}
        className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/20 border border-indigo-500 hover:-translate-y-0.5 active:translate-y-0"
      >
        <RefreshCcw className="w-5 h-5" /> Retry Connection
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-[calc(100vh-80px)]">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold mb-2 tracking-tight" style={{ color: "var(--text-primary)" }}>
          Active Auctions
        </h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Discover and bid on premium verified vehicles.
        </p>
      </div>

      <Filters
        yearFilter={yearFilter}
        mileageFilter={mileageFilter}
        sortBy={sortBy}
        onYearChange={setYearFilter}
        onMileageChange={setMileageFilter}
        onSortChange={setSortBy}
      />

      <div className="flex justify-between items-end mb-6 mt-8">
        <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
          {debouncedSearch && <span>Search: "{debouncedSearch}" &bull; </span>}
          Inventory Listed ({totalVehicles.toLocaleString("en-IN")})
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error && vehicles.length === 0 ? (
        <ErrorStateUI />
      ) : vehicles.length === 0 ? (
        <NoVehicles />
      ) : (
        <>
          {/* Main Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle._id} vehicle={vehicle} />
            ))}
          </div>

          {/* Non-destructive Error Toast if an append-load fails */}
          {error && vehicles.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-8 flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => loadVehicles(true)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-semibold transition-colors"
              >
                Retry Load More
              </button>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !error && (
            <div className="flex justify-center pb-12">
              <button
                onClick={() => loadVehicles(true)}
                disabled={isFetchingMore}
                className="px-8 py-3.5 font-semibold rounded-xl transition-all shadow-md flex items-center gap-2 group disabled:opacity-50"
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)" }}
              >
                {isFetchingMore ? (
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="w-5 h-5 flex items-center justify-center font-bold text-lg leading-none">
                    +
                  </span>
                )}
                {isFetchingMore ? "Loading..." : "Load 20 More Cars"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Auctions;
