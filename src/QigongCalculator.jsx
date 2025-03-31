import React, { useState, useEffect, useRef } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { supabase } from "./supabaseClient"; // Import Supabase client

const QigongCalculator = () => {
    const [dailyLog, setDailyLog] = useState([]);
    const [currentDay, setCurrentDay] = useState(1);
    const [currentEnergy, setCurrentEnergy] = useState(1); // Start with 1 energy point
    const [isPracticing, setIsPracticing] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [elapsedTime, setElapsedTime] = useState(0); // In seconds
    const [accumulatedSecondsToday, setAccumulatedSecondsToday] = useState(0); // New state for total seconds
    const intervalRef = useRef(null); // To hold the interval ID
    const [isLoading, setIsLoading] = useState(true); // Add loading state

    // Constants
    const targetEnergy = 100;
    const dailyEnergyLoss = 0.1; // 10% loss on skipped days

    // New state for editing
    const [editingDay, setEditingDay] = useState(null); // Track which day's minutes are being edited

    // Fetch initial data from Supabase
    useEffect(() => {
        const fetchLog = async () => {
            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("calculations")
                    .select("*")
                    .order("day", { ascending: true });

                if (error) {
                    console.error("Error fetching calculation log:", error);
                    throw error;
                }

                if (data && data.length > 0) {
                    // Map Supabase data to the structure expected by dailyLog
                    const fetchedLog = data.map((item) => ({
                        day: item.day,
                        energy: item.energy,
                        practice: item.practice,
                        minutes: item.minutes,
                        gain: item.gain, // Make sure 'gain' column exists or adjust
                        loss: item.loss, // Make sure 'loss' column exists or adjust
                        growthFactor: item.growthFactor, // Make sure 'growthFactor' exists or adjust
                        // Add other fields if necessary, ensuring names match
                    }));
                    setDailyLog(fetchedLog);
                    const lastLog = fetchedLog[fetchedLog.length - 1];
                    setCurrentEnergy(lastLog.energy);
                    // Set currentDay to the day *after* the last logged day
                    setCurrentDay(lastLog.day + 1);
                } else {
                    // Initialize if no data found
                    setDailyLog([]);
                    setCurrentDay(1);
                    setCurrentEnergy(1);
                }
            } catch (error) {
                console.error("Failed to initialize from Supabase:", error);
                // Handle error appropriately, maybe set default state
                setDailyLog([]);
                setCurrentDay(1);
                setCurrentEnergy(1);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLog();
    }, []); // Empty dependency array ensures this runs only once on mount

    // Calculate dynamic growth factor based on practice minutes
    const calculateGrowthFactor = (minutes) => {
        // Based on testing with true compounding, this formula ensures:
        // 90 days @ 40min → approximately 100 energy points
        // 30 days @ 120min → approximately 100 energy points
        const baseValue = 0.995776;
        const minuteMultiplier = 0.001418;
        return baseValue + minutes * minuteMultiplier;
    };

    // Reset the simulation
    const resetSimulation = async () => {
        if (
            !window.confirm(
                "Are you sure you want to reset all data? This will clear your entire practice history."
            )
        ) {
            return; // Stop if user cancels
        }

        // Clear Supabase table
        try {
            setIsLoading(true); // Show loading indicator
            const { error } = await supabase
                .from("calculations")
                .delete()
                .neq("day", -1); // Delete all rows (using a condition that's always true)

            if (error) {
                console.error("Error clearing Supabase data:", error);
                alert("Failed to clear practice history. Please try again.");
                // Don't reset local state if Supabase failed
                return;
            }
            console.log("Supabase calculation data cleared.");
        } catch (error) {
            console.error("Unexpected error during Supabase delete:", error);
            alert("An unexpected error occurred while clearing history.");
            return;
        } finally {
            setIsLoading(false);
        }

        // Clear local state only after successful Supabase clear
        setDailyLog([]);
        setCurrentDay(1);
        setCurrentEnergy(1);
        setIsPracticing(false);
        setStartTime(null);
        setElapsedTime(0);
        setAccumulatedSecondsToday(0);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    // Stopwatch Timer Effect
    useEffect(() => {
        if (isPracticing && startTime) {
            intervalRef.current = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        // Cleanup interval on component unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isPracticing, startTime]);

    // Start Practice Handler
    const handleStartPractice = () => {
        if (isPracticing) return;
        setStartTime(Date.now() - elapsedTime * 1000);
        setIsPracticing(true);
    };

    // End Practice Handler
    const handleEndPractice = async () => {
        if (!isPracticing || !startTime) return;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const endTime = Date.now();
        const currentIntervalSeconds = Math.floor((endTime - startTime) / 1000);
        const newAccumulatedSeconds =
            accumulatedSecondsToday + currentIntervalSeconds;
        const totalMinutesToday = Math.max(
            1,
            Math.round(newAccumulatedSeconds / 60)
        );

        // Determine starting energy for today's calculation
        const previousDayEnergy =
            dailyLog.length > 0 ? dailyLog[dailyLog.length - 1].energy : 1;
        const startingEnergyForToday = dailyLog.find(
            (log) => log.day === currentDay
        )?.practice
            ? previousDayEnergy
            : currentEnergy;

        // Calculate new energy level based on TOTAL minutes today
        const growthFactor = calculateGrowthFactor(totalMinutesToday);
        // Calculate based on the start of the day's energy or the initial energy if day 1
        const startEnergy =
            dailyLog.length > 0 &&
            dailyLog[dailyLog.length - 1].day === currentDay - 1
                ? dailyLog[dailyLog.length - 1].energy
                : currentDay === 1
                ? 1
                : currentEnergy; // Fallback, though previous logic might be better

        const previousEnergyLevel =
            dailyLog.length > 0 ? dailyLog[dailyLog.length - 1].energy : 1;

        // Find the energy at the START of the current day
        const startOfDayEnergy =
            dailyLog.find((log) => log.day === currentDay - 1)?.energy ?? 1;

        // Calculate new energy based on compounding from the start of the day
        const newTotalEnergyToday = startOfDayEnergy * growthFactor;
        const totalGainToday = newTotalEnergyToday - startOfDayEnergy;

        // Update the main current energy state
        setCurrentEnergy(newTotalEnergyToday);
        setAccumulatedSecondsToday(newAccumulatedSeconds);

        // Prepare log entry
        const logEntryData = {
            day: currentDay,
            energy: parseFloat(newTotalEnergyToday.toFixed(2)),
            practice: true,
            minutes: totalMinutesToday,
            gain: parseFloat(totalGainToday.toFixed(2)),
            growthFactor: parseFloat(growthFactor.toFixed(6)),
            loss: null, // Practice day means no loss
        };

        // Update local state
        const logIndex = dailyLog.findIndex((log) => log.day === currentDay);
        let updatedLog = [...dailyLog];
        if (logIndex > -1) {
            updatedLog[logIndex] = logEntryData;
        } else {
            updatedLog.push(logEntryData);
        }
        setDailyLog(updatedLog);

        // --- Save to Supabase ---
        console.log("Upserting to Supabase:", logEntryData); // Log data being sent
        try {
            const { data, error } = await supabase
                .from("calculations")
                .upsert(logEntryData, { onConflict: "day" }); // Upsert based on day

            if (error) {
                console.error("Error saving practice log to Supabase:", error);
                // Handle error - maybe revert local state or show message?
                throw error;
            }
            console.log("Practice log saved successfully:", data);
        } catch (error) {
            // Handle unexpected errors during Supabase operation
        }
        // ----------------------

        // Reset timer state, ready for potential restart
        setIsPracticing(false);
        setStartTime(null);
        setElapsedTime(0);
    };

    // Log a skipped day
    const logSkippedDay = async () => {
        if (isPracticing) return;
        if (accumulatedSecondsToday > 0) return; // Don't log skip if practice started

        const energyLoss = currentEnergy * dailyEnergyLoss;
        const newEnergy = currentEnergy - energyLoss;

        // Prepare skip log entry
        const skipLogData = {
            day: currentDay,
            energy: parseFloat(newEnergy.toFixed(2)),
            practice: false,
            minutes: 0,
            gain: null,
            growthFactor: null,
            loss: parseFloat(energyLoss.toFixed(2)),
        };

        // Update local state
        const newLog = [...dailyLog, skipLogData];
        setDailyLog(newLog);
        setCurrentEnergy(newEnergy);

        // --- Save to Supabase ---
        console.log("Inserting skipped day to Supabase:", skipLogData); // Log data being sent
        try {
            const { data, error } = await supabase
                .from("calculations")
                .insert(skipLogData);

            if (error) {
                console.error(
                    "Error saving skipped day log to Supabase:",
                    error
                );
                // Handle error
                throw error;
            }
            console.log("Skipped day log saved successfully:", data);
        } catch (error) {
            // Handle unexpected errors during Supabase operation
        }
        // ----------------------

        // Advance to next day and reset (local state change)
        setCurrentDay(currentDay + 1);
        setIsPracticing(false);
        setStartTime(null);
        setElapsedTime(0);
        setAccumulatedSecondsToday(0);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    // Renamed from nextDay: ADVANCES DAY AND RESETS TIMER
    const advanceToNextDay = () => {
        if (isPracticing) return;

        // If no practice or skip has been logged for the current day,
        // create a default skip entry before advancing.
        const todayLogExists = dailyLog.some((log) => log.day === currentDay);
        if (!todayLogExists) {
            const energyLoss = currentEnergy * dailyEnergyLoss;
            const newEnergy = currentEnergy - energyLoss;
            const skipLog = {
                day: currentDay,
                energy: parseFloat(newEnergy.toFixed(2)),
                practice: false,
                minutes: 0,
                loss: parseFloat(energyLoss.toFixed(2)),
            };
            setDailyLog([...dailyLog, skipLog]);
            setCurrentEnergy(newEnergy); // Update energy based on the implicit skip
        }

        // Advance day counter
        setCurrentDay(currentDay + 1);

        // Reset stopwatch state for the new day
        setIsPracticing(false);
        setStartTime(null);
        setElapsedTime(0);
        setAccumulatedSecondsToday(0);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    // Determine progress color
    const getProgressColor = () => {
        const percentComplete = (currentEnergy / targetEnergy) * 100;
        if (percentComplete >= 100) return "bg-green-500";
        if (percentComplete >= 75) return "bg-green-400";
        if (percentComplete >= 50) return "bg-yellow-400";
        if (percentComplete >= 25) return "bg-yellow-500";
        return "bg-red-500";
    };

    // Determine progress message
    const getProgressMessage = () => {
        const percentComplete = (currentEnergy / targetEnergy) * 100;

        if (percentComplete >= 150) return "Extraordinary Mastery!";
        if (percentComplete >= 100) return "Goal Achieved!";
        if (percentComplete >= 75) return "Excellent Progress";
        if (percentComplete >= 50) return "Good Progress";
        if (percentComplete >= 25) return "Building Foundation";
        if (percentComplete > 0) return "Beginning Journey";
        return "Start Your Practice";
    };

    // Format for tooltip
    const formatTooltip = (value, name, props) => {
        if (name === "energy")
            return [`${value.toFixed(1)} energy`, "Energy Level"];
        return [value, name];
    };

    // Helper function to format seconds into HH:MM:SS
    const formatTime = (totalSeconds) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };

    // Recalculate energy levels from a specific day forward
    // Handles both local state and Supabase updates
    const recalculateEnergyFromDay = async (startIndex, logData) => {
        setIsLoading(true);
        let recalculatedLog = [...logData]; // Use the passed log data
        let updatesForSupabase = [];

        // Get the energy level from the day *before* the startIndex
        let previousDayEnergy =
            startIndex > 0 ? recalculatedLog[startIndex - 1].energy : 1;

        for (let i = startIndex; i < recalculatedLog.length; i++) {
            let currentEntry = { ...recalculatedLog[i] }; // Create a mutable copy
            let startEnergyForDay = previousDayEnergy;

            if (currentEntry.practice) {
                const growthFactor = calculateGrowthFactor(
                    currentEntry.minutes
                );
                const newEnergy = startEnergyForDay * growthFactor;
                const energyGain = newEnergy - startEnergyForDay;

                // Update entry for local state & Supabase
                currentEntry.energy = parseFloat(newEnergy.toFixed(2));
                currentEntry.gain = parseFloat(energyGain.toFixed(2));
                currentEntry.growthFactor = parseFloat(growthFactor.toFixed(6));
                currentEntry.loss = null; // Reset loss if it was previously skipped
            } else {
                // If a day was skipped, recalculate loss based on potentially changed previous day energy
                const energyLoss = startEnergyForDay * dailyEnergyLoss;
                const newEnergy = startEnergyForDay - energyLoss;

                // Update entry for local state & Supabase
                currentEntry.energy = parseFloat(newEnergy.toFixed(2));
                currentEntry.loss = parseFloat(energyLoss.toFixed(2));
                currentEntry.gain = null; // Reset gain
                currentEntry.growthFactor = null; // Reset growthFactor
            }

            recalculatedLog[i] = currentEntry; // Update the local array copy
            updatesForSupabase.push(currentEntry); // Add to batch update
            previousDayEnergy = currentEntry.energy; // Set energy for next iteration
        }

        // --- Update Supabase ---
        if (updatesForSupabase.length > 0) {
            console.log(
                "Batch updating Supabase with recalculated data:",
                updatesForSupabase
            );
            try {
                const { data, error } = await supabase
                    .from("calculations")
                    .upsert(updatesForSupabase, { onConflict: "day" });

                if (error) {
                    console.error(
                        "Error batch updating Supabase after edit:",
                        error
                    );
                    alert(
                        "Failed to save recalculations to the database. Please check console and refresh."
                    );
                    setIsLoading(false);
                    return; // Stop if Supabase update fails
                }
                console.log("Supabase batch update successful:", data);
            } catch (error) {
                console.error(
                    "Unexpected error during Supabase batch update:",
                    error
                );
                alert(
                    "An unexpected error occurred while saving recalculations."
                );
                setIsLoading(false);
                return;
            }
        }
        // ---------------------

        // Update local state only after successful Supabase update
        setDailyLog(recalculatedLog);

        // Update currentEnergy based on the energy level at the END of the day *before* the current UI day
        const lastCalculatedDayBeforeCurrent = recalculatedLog.findLast(
            (log) => log.day < currentDay
        );
        const energyBeforeCurrentDay =
            lastCalculatedDayBeforeCurrent?.energy ?? 1; // Default to 1 if no previous day

        // If the current day has a log entry, use its energy, otherwise use the energy from the end of the previous day.
        const currentDayLog = recalculatedLog.find(
            (log) => log.day === currentDay
        );
        setCurrentEnergy(currentDayLog?.energy ?? energyBeforeCurrentDay);
        setIsLoading(false);
    };

    // Handle editing minutes for a past day
    const handleEditMinutes = async (day, newMinutesStr) => {
        const newMinutes = parseInt(newMinutesStr, 10);

        // Basic validation
        if (isNaN(newMinutes) || newMinutes < 0) {
            console.warn("Invalid minutes entered:", newMinutesStr);
            // Maybe add user feedback here, e.g., reset input or show alert
            setEditingDay(null); // Exit editing mode on invalid input
            return;
        }

        const targetIndex = dailyLog.findIndex((log) => log.day === day);
        if (targetIndex === -1) {
            console.error("Edited day not found in log:", day);
            setEditingDay(null);
            return;
        }

        // Ensure we are editing a practice day's minutes
        if (!dailyLog[targetIndex].practice) {
            console.warn("Cannot edit minutes for a skipped day.");
            setEditingDay(null);
            return;
        }

        // Avoid recalculation if minutes haven't changed
        if (dailyLog[targetIndex].minutes === newMinutes) {
            setEditingDay(null); // Just exit editing mode
            return;
        }

        // Create an updated log copy *before* recalculation for the function
        const logCopyWithEdit = dailyLog.map((log, index) => {
            if (index === targetIndex) {
                return { ...log, minutes: newMinutes };
            }
            return log;
        });

        // Recalculate starting from the edited day
        // This function now handles Supabase updates internally
        await recalculateEnergyFromDay(targetIndex, logCopyWithEdit);

        setEditingDay(null); // Exit editing mode after successful recalculation and save
    };

    // Determine if any practice has happened today (used for button logic)
    const hasPracticedToday = dailyLog.some(
        (log) => log.day === currentDay && log.practice
    );

    // Render loading state
    if (isLoading) {
        return <div className="p-4">Loading practice history...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center mb-4">
                Qigong Energy Tracker
            </h1>
            <div className="text-center text-gray-600 mb-6">
                Track your qigong energy growth through consistent practice
            </div>

            {/* Configuration Panel - Replaced with Stopwatch */}
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <h2 className="text-lg font-semibold mb-3">
                    Practice Timer (Day {currentDay})
                </h2>
                <div className="space-y-3 text-center">
                    <div className="text-4xl font-mono font-semibold text-blue-600">
                        {formatTime(accumulatedSecondsToday + elapsedTime)}
                    </div>
                    <div className="text-lg font-semibold text-gray-500">
                        {isPracticing
                            ? "Practice in progress..."
                            : accumulatedSecondsToday > 0
                            ? `Total today: ${formatTime(
                                  accumulatedSecondsToday
                              )} (${Math.round(
                                  accumulatedSecondsToday / 60
                              )} min)`
                            : "Ready to start?"}
                    </div>
                    {isPracticing ? (
                        <button
                            onClick={handleEndPractice}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded"
                        >
                            Pause Practice
                        </button>
                    ) : (
                        <button
                            onClick={handleStartPractice}
                            className={`w-full font-bold py-3 px-4 rounded bg-green-500 hover:bg-green-600 text-white`}
                        >
                            {accumulatedSecondsToday > 0
                                ? "Resume Practice"
                                : "Start Practice"}
                        </button>
                    )}
                    <div className="text-xs text-gray-500 italic mt-2">
                        {isPracticing
                            ? "Press 'Pause Practice' when taking a break or finished for the session."
                            : "Press 'Start/Resume Practice' to time your session(s)."}
                    </div>
                </div>
            </div>

            {/* Current Progress */}
            <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">
                    Current Energy Level
                </h2>
                <div className="bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                        className={`h-full ${getProgressColor()} transition-all duration-500`}
                        style={{
                            width: `${Math.min(
                                100,
                                (currentEnergy / targetEnergy) * 100
                            )}%`,
                        }}
                    ></div>
                </div>
                <div className="mt-2 flex justify-between">
                    <span className="text-sm text-gray-600">
                        Day {currentDay}
                    </span>
                    <span className="text-sm font-medium">
                        {currentEnergy.toFixed(1)} / {targetEnergy} energy
                        points
                    </span>
                </div>
                <div className="mt-1 text-center font-medium text-lg">
                    {getProgressMessage()}
                </div>
            </div>

            {/* Practice Tracking - REMOVE Log Practice Button, Combine Skip/Next Day */}
            <div className="mb-6 border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">
                    End of Day (Day {currentDay})
                </h2>
                {/* Show Skip OR Next Day Button */}
                {!hasPracticedToday ? (
                    <div className="space-y-3">
                        <button
                            onClick={logSkippedDay}
                            // Disable skip if timer running OR if any practice already done
                            disabled={
                                isPracticing || accumulatedSecondsToday > 0
                            }
                            className={`font-bold py-3 px-4 rounded w-full ${
                                isPracticing || accumulatedSecondsToday > 0
                                    ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                                    : "bg-red-500 hover:bg-red-600 text-white"
                            }`}
                        >
                            Skip Day & Advance
                        </button>
                        <div className="text-sm text-gray-600 italic text-center">
                            {isPracticing && "Pause timer before skipping."}
                            {accumulatedSecondsToday > 0 &&
                                "Cannot skip after practicing."}
                            {!isPracticing &&
                                accumulatedSecondsToday === 0 &&
                                "Use the timer above or skip the day."}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="text-center text-green-700 font-medium">
                            Day {currentDay} activity recorded! (
                            {dailyLog.find((d) => d.day === currentDay)
                                ?.practice
                                ? `${
                                      dailyLog.find((d) => d.day === currentDay)
                                          ?.minutes
                                  } min practiced`
                                : "Skipped"}
                            )
                        </div>
                        <button
                            onClick={advanceToNextDay}
                            disabled={isPracticing} // Cannot advance if timer is running for the current day
                            className={`w-full font-bold py-3 px-4 rounded ${
                                isPracticing
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-500 hover:bg-blue-600 text-white"
                            }`}
                        >
                            Finish Day & Advance
                        </button>
                        <div className="text-sm text-gray-600 italic text-center">
                            {isPracticing && "Pause timer before advancing."}
                            {!isPracticing && "Ready for the next day."}
                        </div>
                    </div>
                )}
            </div>

            {/* Simulation Tools */}
            <div className="mb-6 border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">
                    Practice Tracker Tools
                </h2>
                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={resetSimulation}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded"
                    >
                        Reset Energy Tracker
                    </button>
                </div>
            </div>

            {/* Energy Chart */}
            {dailyLog.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-lg font-semibold mb-3">
                        Energy Progression
                    </h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={dailyLog}
                                margin={{
                                    top: 5,
                                    right: 30,
                                    left: 20,
                                    bottom: 5,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    label={{
                                        value: "Day",
                                        position: "insideBottomRight",
                                        offset: -5,
                                    }}
                                />
                                <YAxis
                                    label={{
                                        value: "Energy",
                                        angle: -90,
                                        position: "insideLeft",
                                    }}
                                />
                                <Tooltip formatter={formatTooltip} />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="energy"
                                    stroke="#2563eb"
                                    activeDot={{ r: 8 }}
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Practice Log - Modified for editing */}
            {dailyLog.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">
                        Practice History
                    </h2>
                    <div className="overflow-auto max-h-[300px] border rounded">
                        {" "}
                        {/* Increased max-height slightly */}
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                {/* Added z-index */}
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Day
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Activity
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                                        {/* Added fixed width */}
                                        Minutes
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Energy Change
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total Energy
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {dailyLog.map((log) => (
                                    <tr
                                        key={log.day}
                                        className={
                                            log.practice
                                                ? "bg-green-50"
                                                : "bg-red-50"
                                        }
                                    >
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            {log.day}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            {log.practice ? (
                                                <span className="text-green-600">
                                                    Practiced
                                                </span>
                                            ) : (
                                                <span className="text-red-600">
                                                    Skipped
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            {log.practice ? (
                                                editingDay === log.day ? (
                                                    <input
                                                        type="number"
                                                        defaultValue={
                                                            log.minutes
                                                        }
                                                        onBlur={(e) =>
                                                            handleEditMinutes(
                                                                log.day,
                                                                e.target.value
                                                            )
                                                        }
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key ===
                                                                "Enter"
                                                            ) {
                                                                handleEditMinutes(
                                                                    log.day,
                                                                    e.target
                                                                        .value
                                                                );
                                                            }
                                                            if (
                                                                e.key ===
                                                                "Escape"
                                                            ) {
                                                                setEditingDay(
                                                                    null
                                                                ); // Cancel edit
                                                            }
                                                        }}
                                                        className="w-16 text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1"
                                                        autoFocus // Focus the input when it appears
                                                    />
                                                ) : (
                                                    <span
                                                        onClick={() =>
                                                            setEditingDay(
                                                                log.day
                                                            )
                                                        }
                                                        className="cursor-pointer hover:text-blue-600" // Restore className
                                                    >
                                                        {log.minutes}
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-gray-500">
                                                    0
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            {log.practice ? (
                                                <span
                                                    className="text-green-600"
                                                    title={`Growth factor: ${log.growthFactor?.toFixed(
                                                        6
                                                    )}x`}
                                                >
                                                    +{log.gain?.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-red-600">
                                                    -{log.loss?.toFixed(2)}
                                                    <span className="text-xs ml-1 text-gray-500">
                                                        (
                                                        {(
                                                            dailyEnergyLoss *
                                                            100
                                                        ).toFixed(0)}
                                                        %)
                                                    </span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap font-medium">
                                            {log.energy}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QigongCalculator;
