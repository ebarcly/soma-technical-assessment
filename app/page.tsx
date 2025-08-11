"use client";
import { useState, useEffect } from "react";

interface TodoDependency {
  id: number;
  dependsOn: {
    id: number;
    title: string;
    estimatedDuration: number | null;
  };
}

interface Todo {
  id: number;
  title: string;
  dueDate: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  estimatedDuration: number | null;
  createdAt: string;
  dependencies: TodoDependency[];
  dependents: any[];
}

interface CriticalPathData {
  criticalPath: number[];
  earliestStartTimes: { id: number; earliestStart: number }[];
  totalDuration: number;
}

export default function Home() {
  const [newTodo, setNewTodo] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newDuration, setNewDuration] = useState("");
  const [selectedDependencies, setSelectedDependencies] = useState<number[]>(
    []
  );
  const [todos, setTodos] = useState<Todo[]>([]);
  const [criticalPath, setCriticalPath] = useState<CriticalPathData | null>(
    null
  );
  const [showDependencyView, setShowDependencyView] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState<
    Record<number, boolean>
  >({});

  useEffect(() => {
    fetchTodos();
    fetchCriticalPath();
  }, []);

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error("Failed to fetch todos:", error);
    }
  };

  const fetchCriticalPath = async () => {
    try {
      const res = await fetch("/api/todos/critical-path");
      const data = await res.json();
      setCriticalPath(data);
    } catch (error) {
      console.error("Failed to fetch critical path:", error);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;

    setIsLoading(true);
    try {
      const todoData = {
        title: newTodo,
        dueDate: newDueDate || null,
        estimatedDuration: newDuration ? parseInt(newDuration) : null,
        dependencies: selectedDependencies,
      };

      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(todoData),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to create todo");
        return;
      }

      setNewTodo("");
      setNewDueDate("");
      setNewDuration("");
      setSelectedDependencies([]);
      await fetchTodos();
      await fetchCriticalPath();
    } catch (error) {
      console.error("Failed to add todo:", error);
      alert("Failed to create todo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTodo = async (id: number) => {
    try {
      await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });
      await fetchTodos();
      await fetchCriticalPath();
    } catch (error) {
      console.error("Failed to delete todo:", error);
    }
  };

  const addDependency = async (todoId: number, dependsOnId: number) => {
    try {
      const res = await fetch(`/api/todos/${todoId}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependsOnId }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || "Failed to add dependency");
        return;
      }

      await fetchTodos();
      await fetchCriticalPath();
    } catch (error) {
      console.error("Failed to add dependency:", error);
    }
  };

  const removeDependency = async (todoId: number, dependsOnId: number) => {
    try {
      await fetch(`/api/todos/${todoId}/dependencies`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dependsOnId }),
      });

      await fetchTodos();
      await fetchCriticalPath();
    } catch (error) {
      console.error("Failed to remove dependency:", error);
    }
  };

  const handleImageLoad = (todoId: number) => {
    setImageLoadingStates((prev) => ({ ...prev, [todoId]: false }));
  };

  const handleImageStart = (todoId: number) => {
    setImageLoadingStates((prev) => ({ ...prev, [todoId]: true }));
  };

  const isDueDateOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const formatDueDate = (dueDate: string | null): string => {
    if (!dueDate) return "";
    return new Date(dueDate).toLocaleDateString();
  };

  const getEarliestStartDate = (todoId: number): number => {
    return (
      criticalPath?.earliestStartTimes.find((item) => item.id === todoId)
        ?.earliestStart || 0
    );
  };

  const isOnCriticalPath = (todoId: number): boolean => {
    return criticalPath?.criticalPath.includes(todoId) || false;
  };

  const handleDependencyToggle = (todoId: number) => {
    setSelectedDependencies((prev) =>
      prev.includes(todoId)
        ? prev.filter((id) => id !== todoId)
        : [...prev, todoId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-500 to-red-500 flex flex-col items-center p-4">
      <div className="w-full max-w-4xl">
        <h1 className="text-4xl font-bold text-center text-white mb-8">
          Enhanced Todo App
        </h1>

        {/* Controls (dependency view) */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={() => setShowDependencyView(!showDependencyView)}
            className="bg-white text-indigo-600 px-4 py-2 rounded-full hover:bg-gray-100 transition duration-300"
          >
            {showDependencyView ? "List View" : "Dependency View"}
          </button>
        </div>

        {/* Critical path info */}
        {criticalPath && (
          <div className="bg-white bg-opacity-90 p-4 mb-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold text-gray-800 mb-2">
              Project Overview
            </h2>
            <p className="text-gray-700">
              <strong>Total Duration:</strong> {criticalPath.totalDuration} days
            </p>
            <p className="text-gray-700">
              <strong>Critical Path:</strong> {criticalPath.criticalPath.length}{" "}
              tasks
            </p>
          </div>
        )}

        {/* Add todo form */}
        <div className="bg-white bg-opacity-90 p-6 mb-6 rounded-lg shadow-lg">
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              className="flex-grow p-3 rounded-lg focus:outline-none text-gray-700"
              placeholder="Add a new todo"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
            />
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="p-3 rounded-lg focus:outline-none text-gray-700"
            />
            <input
              type="number"
              placeholder="Duration (days)"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className="p-3 rounded-lg focus:outline-none text-gray-700 w-32"
            />
            <button
              onClick={handleAddTodo}
              disabled={isLoading}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition duration-300 disabled:opacity-50"
            >
              {isLoading ? "Adding..." : "Add"}
            </button>
          </div>

          {/* Dependency selection */}
          {todos.length > 0 && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Dependencies:
              </label>
              <div className="flex flex-wrap gap-2">
                {todos.map((todo) => (
                  <label key={todo.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedDependencies.includes(todo.id)}
                      onChange={() => handleDependencyToggle(todo.id)}
                    />
                    <span className="text-sm text-gray-700">{todo.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Todos list */}
        <div className="space-y-4">
          {todos.map((todo) => (
            <div
              key={todo.id}
              className={`bg-white bg-opacity-90 p-4 rounded-lg shadow-lg ${
                isOnCriticalPath(todo.id) ? "ring-4 ring-yellow-400" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {todo.title}
                    </h3>
                    {isOnCriticalPath(todo.id) && (
                      <span className="bg-yellow-400 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                        CRITICAL
                      </span>
                    )}
                  </div>

                  {/* Due Date */}
                  {todo.dueDate && (
                    <p
                      className={`text-sm ${
                        isDueDateOverdue(todo.dueDate)
                          ? "text-red-500 font-bold"
                          : "text-gray-600"
                      }`}
                    >
                      Due: {formatDueDate(todo.dueDate)}
                      {isDueDateOverdue(todo.dueDate) && " (OVERDUE)"}
                    </p>
                  )}

                  {/* Duration and Start Time */}
                  <div className="text-sm text-gray-600 mb-2">
                    {todo.estimatedDuration && (
                      <span>Duration: {todo.estimatedDuration} days • </span>
                    )}
                    <span>
                      Earliest start: Day {getEarliestStartDate(todo.id)}
                    </span>
                  </div>

                  {/* Dependencies */}
                  {todo.dependencies.length > 0 && (
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>Depends on:</strong>{" "}
                      {todo.dependencies.map((dep, index) => (
                        <span key={dep.dependsOn.id}>
                          {dep.dependsOn.title}
                          {index < todo.dependencies.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Image */}
                  {todo.imageUrl && (
                    <div className="mt-2 mb-2">
                      {imageLoadingStates[todo.id] && (
                        <div className="bg-gray-200 h-32 w-48 rounded-lg flex items-center justify-center">
                          <span className="text-gray-500">
                            Loading image...
                          </span>
                        </div>
                      )}
                      <img
                        src={todo.imageUrl}
                        alt={todo.imageAlt || `Image for ${todo.title}`}
                        className="h-32 w-48 object-cover rounded-lg shadow-md"
                        onLoad={() => handleImageLoad(todo.id)}
                        onLoadStart={() => handleImageStart(todo.id)}
                        style={{
                          display: imageLoadingStates[todo.id]
                            ? "none"
                            : "block",
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="text-red-500 hover:text-red-700 transition duration-300 ml-4"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Dependency Management */}
              {showDependencyView && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Add dependency:
                    </span>
                    {todos
                      .filter(
                        (t) =>
                          t.id !== todo.id &&
                          !todo.dependencies.some(
                            (d) => d.dependsOn.id === t.id
                          )
                      )
                      .map((availableTodo) => (
                        <button
                          key={availableTodo.id}
                          onClick={() =>
                            addDependency(todo.id, availableTodo.id)
                          }
                          className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200 transition duration-200"
                        >
                          + {availableTodo.title}
                        </button>
                      ))}
                  </div>

                  {todo.dependencies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm font-semibold text-gray-700">
                        Remove dependency:
                      </span>
                      {todo.dependencies.map((dep) => (
                        <button
                          key={dep.dependsOn.id}
                          onClick={() =>
                            removeDependency(todo.id, dep.dependsOn.id)
                          }
                          className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs hover:bg-red-200 transition duration-200"
                        >
                          - {dep.dependsOn.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {todos.length === 0 && (
          <div className="text-center text-white text-lg mt-8">
            No todos yet. Add your first task above!
          </div>
        )}
      </div>
    </div>
  );
}
