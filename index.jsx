import React, { useState } from "react";
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

const QigongCalculator = () => {
    const [practiceMinutes, setPracticeMinutes] = useState(40);
    const [dailyLog, setDailyLog] = useState([]);
    const [currentDay, setCurrentDay] = useState(1);
    const [currentEnergy, setCurrentEnergy] = useState(1); // Start with 1 energy point
    const [didPracticeToday, setDidPracticeToday] = useState(false);

    // Constants
    const targetEnergy = 100;
    const dailyEnergyLoss = 0.1; // 10% loss on skipped days

    // Common practice durations
    const commonDurations = [10, 15, 20, 30, 40, 60, 90, 120];

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
    const resetSimulation = () => {
        setDailyLog([]);
        setCurrentDay(1);
        setCurrentEnergy(1); // Reset to 1 energy point
        setDidPracticeToday(false);
    };

    // Log a practice day
    const logPracticeDay = () => {
        if (didPracticeToday) return;

        // Pure compounding - just multiply by growth factor
        const growthFactor = calculateGrowthFactor(practiceMinutes);
        const newEnergy = currentEnergy * growthFactor;
        const energyGain = newEnergy - currentEnergy;

        const newLog = [
            ...dailyLog,
            {
                day: currentDay,
                energy: parseFloat(newEnergy.toFixed(2)),
                practice: true,
                minutes: practiceMinutes,
                gain: parseFloat(energyGain.toFixed(2)),
                growthFactor: parseFloat(growthFactor.toFixed(6)),
            },
        ];

        setDailyLog(newLog);
        setCurrentEnergy(newEnergy);
        setCurrentDay(currentDay + 1);
        setDidPracticeToday(true);
    };

    // Log a skipped day
    const logSkippedDay = () => {
        if (didPracticeToday) return;

        const energyLoss = currentEnergy * dailyEnergyLoss;
        const newEnergy = currentEnergy - energyLoss;

        const newLog = [
            ...dailyLog,
            {
                day: currentDay,
                energy: parseFloat(newEnergy.toFixed(2)),
                practice: false,
                minutes: 0,
                loss: parseFloat(energyLoss.toFixed(2)),
            },
        ];

        setDailyLog(newLog);
        setCurrentEnergy(newEnergy);
        setCurrentDay(currentDay + 1);
        setDidPracticeToday(true);
    };

    // Next day button
    const nextDay = () => {
        setDidPracticeToday(false);
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

    return (
        <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center mb-4">
                Qigong Energy Tracker
            </h1>
            <div className="text-center text-gray-600 mb-6">
                Track your qigong energy growth through consistent practice
            </div>

            {/* Configuration Panel */}
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <h2 className="text-lg font-semibold mb-3">Today's Practice</h2>
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Practice Duration (minutes)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            type="range"
                            min="1"
                            max="240"
                            value={practiceMinutes}
                            onChange={(e) =>
                                setPracticeMinutes(
                                    parseInt(e.target.value) || 1
                                )
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="w-16 flex justify-center">
                            <input
                                type="number"
                                min="1"
                                max="240"
                                value={practiceMinutes}
                                onChange={(e) =>
                                    setPracticeMinutes(
                                        parseInt(e.target.value) || 1
                                    )
                                }
                                className="w-16 text-center rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quick Select:
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {commonDurations.map((duration) => (
                                <button
                                    key={duration}
                                    onClick={() => setPracticeMinutes(duration)}
                                    className={`px-2 py-1 text-xs rounded-md ${
                                        practiceMinutes === duration
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                                    }`}
                                >
                                    {duration} min
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="text-sm text-gray-600 italic mb-2 mt-3">
                        Perfect practice for 90 days (40min daily) or 30 days
                        (120min daily) will bring you to 100 energy points
                    </div>

                    <div className="mt-2 text-xs font-medium text-blue-700">
                        Growth Factor:{" "}
                        {calculateGrowthFactor(practiceMinutes).toFixed(4)}x
                        <div className="text-xs text-gray-500 font-normal">
                            (Your energy is multiplied by this factor each day
                            you practice)
                        </div>
                        <div className="mt-1 text-sm font-semibold text-green-600">
                            Expected growth: +
                            {(
                                currentEnergy *
                                    calculateGrowthFactor(practiceMinutes) -
                                currentEnergy
                            ).toFixed(2)}{" "}
                            energy points
                        </div>
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

            {/* Practice Tracking */}
            <div className="mb-6 border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-3">Daily Log</h2>
                {!didPracticeToday ? (
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={logPracticeDay}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded flex-1"
                            >
                                I Practiced Today ({practiceMinutes} min)
                            </button>
                            <button
                                onClick={logSkippedDay}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded flex-1"
                            >
                                I Skipped Today
                            </button>
                        </div>
                        <div className="text-sm text-gray-600 italic">
                            You need to log each day's practice (or skip) to
                            continue tracking your progress
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="text-center text-green-700 font-medium">
                            Day {currentDay - 1} logged successfully!
                        </div>
                        <button
                            onClick={nextDay}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded w-full"
                        >
                            Continue to Next Day
                        </button>
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

            {/* Practice Log */}
            {dailyLog.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-3">
                        Practice History
                    </h2>
                    <div className="overflow-auto max-h-64 border rounded">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Day
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Activity
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                                {dailyLog.map((log, index) => (
                                    <tr
                                        key={index}
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
                                            {log.minutes}
                                        </td>
                                        <td className="px-6 py-2 whitespace-nowrap">
                                            {log.practice ? (
                                                <span
                                                    className="text-green-600"
                                                    title={`Growth factor: ${log.growthFactor}x`}
                                                >
                                                    +{log.gain.toFixed(2)}
                                                    <span className="text-xs ml-1">
                                                        (
                                                        {log.growthFactor.toFixed(
                                                            4
                                                        )}
                                                        x)
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="text-red-600">
                                                    -{log.loss}
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
