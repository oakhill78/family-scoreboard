import React, { useState, useEffect, useRef } from 'react';

// Main App component
const App = () => {
    // State for managing kid names
    const [kidNames, setKidNames] = useState(['Kid 1', 'Kid 2', 'Kid 3', 'Kid 4']);
    // State for managing tasks and their monetary values
    const [tasks, setTasks] = useState([
        { id: 1, name: 'Make Bed', value: 2.00 },
        { id: 2, name: 'Do Dishes', value: 3.50 },
        { id: 3, name: 'Read Book', value: 1.00 },
        { id: 4, name: 'Walk Dog', value: 5.00 },
    ]);
    // State for storing checkbox states (true/false for each of the 3 checkboxes per task per day per kid)
    // Structure: { kidIndex: { taskId: { dayIndex: [bool, bool, bool] } } }
    const [checkboxStates, setCheckboxStates] = useState({});
    // State for daily, weekly, monthly, and cumulative earnings
    const [dailyEarnings, setDailyEarnings] = useState([]);
    const [weeklyEarnings, setWeeklyEarnings] = useState([]);
    const [monthlyEarnings, setMonthlyEarnings] = useState([]);
    const [cumulativeEarnings, setCumulativeEarnings] = useState([]);

    // Reference to the monthly total for persistent storage.
    // This is a simplified way; a real app might use a more robust backend like Firestore.
    const monthlyTotalRef = useRef({});

    // Days of the week for easy mapping
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Load data from localStorage on initial render
    useEffect(() => {
        const savedKidNames = JSON.parse(localStorage.getItem('kidNames'));
        const savedTasks = JSON.parse(localStorage.getItem('tasks'));
        const savedCheckboxStates = JSON.parse(localStorage.getItem('checkboxStates'));
        const savedMonthlyTotalRef = JSON.parse(localStorage.getItem('monthlyTotalRef'));

        if (savedKidNames) setKidNames(savedKidNames);
        if (savedTasks) setTasks(savedTasks);
        if (savedCheckboxStates) setCheckboxStates(savedCheckboxStates);
        if (savedMonthlyTotalRef) monthlyTotalRef.current = savedMonthlyTotalRef;

        // Perform initial calculations based on loaded state
        calculateAllEarnings(savedCheckboxStates || {});
    }, []);

    // Save data to localStorage whenever relevant state changes
    useEffect(() => {
        localStorage.setItem('kidNames', JSON.stringify(kidNames));
        localStorage.setItem('tasks', JSON.stringify(tasks));
        localStorage.setItem('checkboxStates', JSON.stringify(checkboxStates));
        localStorage.setItem('monthlyTotalRef', JSON.stringify(monthlyTotalRef.current));

        calculateAllEarnings(checkboxStates);
    }, [kidNames, tasks, checkboxStates]);

    // Function to handle changes in kid names
    const handleKidNameChange = (index, newName) => {
        const updatedNames = [...kidNames];
        updatedNames[index] = newName;
        setKidNames(updatedNames);
    };

    // Function to handle changes in task name
    const handleTaskNameChange = (id, newName) => {
        const updatedTasks = tasks.map(task =>
            task.id === id ? { ...task, name: newName } : task
        );
        setTasks(updatedTasks);
    };

    // Function to handle changes in task monetary value
    const handleTaskValueChange = (id, newValue) => {
        const updatedTasks = tasks.map(task =>
            task.id === id ? { ...task, value: parseFloat(newValue) || 0 } : task
        );
        setTasks(updatedTasks);
    };

    // Function to add a new task
    const addTask = () => {
        const newId = tasks.length > 0 ? Math.max(...tasks.map(task => task.id)) + 1 : 1;
        setTasks([...tasks, { id: newId, name: '', value: 0.00 }]);
    };

    // Function to remove a task
    const removeTask = (id) => {
        setTasks(tasks.filter(task => task.id !== id));
        // Also remove related checkbox states
        const newCheckboxStates = {};
        for (const kidIndex in checkboxStates) {
            newCheckboxStates[kidIndex] = {};
            for (const taskId in checkboxStates[kidIndex]) {
                if (parseInt(taskId) !== id) {
                    newCheckboxStates[kidIndex][taskId] = checkboxStates[kidIndex][taskId];
                }
            }
        }
        setCheckboxStates(newCheckboxStates);
    };

    // Function to handle checkbox changes
    const handleCheckboxChange = (kidIdx, taskId, dayIdx, checkboxIdx) => {
        setCheckboxStates(prevStates => {
            const newState = { ...prevStates };
            if (!newState[kidIdx]) newState[kidIdx] = {};
            if (!newState[kidIdx][taskId]) newState[kidIdx][taskId] = {};
            if (!newState[kidIdx][taskId][dayIdx]) newState[kidIdx][taskId][dayIdx] = [false, false, false];

            newState[kidIdx][taskId][dayIdx][checkboxIdx] = !newState[kidIdx][taskId][dayIdx][checkboxIdx];
            return newState;
        });
    };

    // Function to calculate all earnings (daily, weekly, monthly, cumulative)
    const calculateAllEarnings = (currentCheckboxStates) => {
        const newDailyEarnings = Array(kidNames.length).fill(0).map(() => Array(7).fill(0));
        const newWeeklyEarnings = Array(kidNames.length).fill(0);
        const newCumulativeEarnings = Array(kidNames.length).fill(0);

        kidNames.forEach((_, kidIdx) => {
            daysOfWeek.forEach((_, dayIdx) => {
                let dailyTotal = 0;
                tasks.forEach(task => {
                    const checkedCount = (currentCheckboxStates[kidIdx]?.[task.id]?.[dayIdx] || []).filter(Boolean).length;
                    dailyTotal += checkedCount * task.value;
                });
                newDailyEarnings[kidIdx][dayIdx] = dailyTotal;
                newWeeklyEarnings[kidIdx] += dailyTotal;
            });
        });

        // Update monthly and cumulative based on previous monthly ref
        const currentMonthData = {};
        kidNames.forEach((_, kidIdx) => {
            currentMonthData[kidIdx] = newWeeklyEarnings[kidIdx];
            newCumulativeEarnings[kidIdx] = (monthlyTotalRef.current[kidIdx] || 0) + newWeeklyEarnings[kidIdx];
        });

        setDailyEarnings(newDailyEarnings);
        setWeeklyEarnings(newWeeklyEarnings);
        setMonthlyEarnings(Object.values(monthlyTotalRef.current)); // Display stored monthly total
        setCumulativeEarnings(newCumulativeEarnings);
    };

    // Function to reset the scoreboard
    const resetScoreboard = () => {
        // Confirm with the user before resetting
        if (window.confirm("Are you sure you want to reset the scoreboard for this week? Monthly totals will be carried over.")) {
            // Add current weekly earnings to monthly total ref
            kidNames.forEach((_, kidIdx) => {
                if (!monthlyTotalRef.current[kidIdx]) {
                    monthlyTotalRef.current[kidIdx] = 0;
                }
                monthlyTotalRef.current[kidIdx] += weeklyEarnings[kidIdx];
            });

            // Clear checkbox states for a fresh week
            setCheckboxStates({});
            // Reset calculated earnings for the new week (monthly will update from ref)
            calculateAllEarnings({}); // Recalculate with empty checkboxes

            // Display a message
            alert("Scoreboard reset for the week! Current week's earnings added to monthly totals.");
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 sm:p-6 lg:p-8 font-inter text-gray-800">
            <script src="https://cdn.tailwindcss.com"></script>
            {/* Tailwind CSS config for Inter font */}
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                }
                `}
            </style>

            <h1 className="text-4xl sm:text-5xl font-bold text-center text-blue-800 mb-8 mt-4 drop-shadow-md">
                TRIBE Kifalme Family Scoreboard
            </h1>

            {/* Kid Names Section */}
            <div className="bg-white p-6 rounded-2xl shadow-xl mb-8 border border-blue-200">
                <h2 className="text-2xl font-semibold text-blue-700 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                        <path d="M17 17.5V10A7 7 0 0 0 3 10v7.5"></path>
                        <path d="M13.5 6.5C13.5 8.15685 12.1569 9.5 10.5 9.5C8.84315 9.5 7.5 8.15685 7.5 6.5C7.5 4.84315 8.84315 3.5 10.5 3.5C12.1569 3.5 13.5 4.84315 13.5 6.5Z"></path>
                        <path d="M22 17.5V10A7 7 0 0 0 8 10v7.5"></path>
                        <path d="M18.5 6.5C18.5 8.15685 17.1569 9.5 15.5 9.5C13.8431 9.5 12.5 8.15685 12.5 6.5C12.5 4.84315 13.8431 3.5 15.5 3.5C17.1569 3.5 18.5 4.84315 18.5 6.5Z"></path>
                    </svg>
                    Kid Names
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {kidNames.map((name, index) => (
                        <input
                            key={index}
                            type="text"
                            value={name}
                            onChange={(e) => handleKidNameChange(index, e.target.value)}
                            placeholder={`Kid ${index + 1}`}
                            className="p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 shadow-sm"
                        />
                    ))}
                </div>
            </div>

            {/* Task List Definition Section */}
            <div className="bg-white p-6 rounded-2xl shadow-xl mb-8 border border-blue-200">
                <h2 className="text-2xl font-semibold text-blue-700 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                        <path d="M8 6h13"></path>
                        <path d="M8 12h13"></path>
                        <path d="M8 18h13"></path>
                        <path d="M3 6h.01"></path>
                        <path d="M3 12h.01"></path>
                        <path d="M3 18h.01"></path>
                    </svg>
                    Tasks & Values
                </h2>
                <div className="space-y-4">
                    {tasks.map(task => (
                        <div key={task.id} className="flex flex-col sm:flex-row items-center gap-3">
                            <input
                                type="text"
                                value={task.name}
                                onChange={(e) => handleTaskNameChange(task.id, e.target.value)}
                                placeholder="Task Name"
                                className="flex-grow p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 shadow-sm"
                            />
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={task.value.toFixed(2)}
                                    onChange={(e) => handleTaskValueChange(task.id, e.target.value)}
                                    placeholder="Value"
                                    className="w-full sm:w-28 p-3 pl-8 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 shadow-sm"
                                />
                            </div>
                            <button
                                onClick={() => removeTask(task.id)}
                                className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200 shadow-md transform hover:scale-105"
                                title="Remove Task"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={addTask}
                        className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md transform hover:scale-105 flex items-center justify-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add New Task
                    </button>
                </div>
            </div>

            {/* Weekly Task Tracking Grid */}
            <div className="bg-white p-6 rounded-2xl shadow-xl mb-8 border border-blue-200 overflow-x-auto">
                <h2 className="text-2xl font-semibold text-blue-700 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    Weekly Task Tracking
                </h2>
                <table className="min-w-full divide-y divide-blue-200">
                    <thead className="bg-blue-50">
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider sticky left-0 bg-blue-50 z-10">Task</th>
                            {kidNames.map((kidName, kidIdx) => (
                                <th key={kidIdx} colSpan={7} className="px-3 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider border-l border-blue-200">
                                    {kidName}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th className="px-3 py-3 text-left text-xs font-medium text-blue-600 uppercase tracking-wider sticky left-0 bg-blue-50 z-10"></th>
                            {kidNames.map((_, kidIdx) => (
                                <React.Fragment key={`days-header-${kidIdx}`}>
                                    {daysOfWeek.map((day, dayIdx) => (
                                        <th key={dayIdx} className="px-2 py-2 text-center text-xs font-medium text-blue-500 uppercase tracking-wider border-l border-blue-100">
                                            {day.substring(0, 3)}
                                        </th>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-blue-100">
                        {tasks.map(task => (
                            <tr key={task.id}>
                                <td className="px-3 py-3 whitespace-nowrap font-medium text-gray-900 sticky left-0 bg-white border-r border-blue-100">
                                    {task.name} <span className="text-gray-500 text-sm">(${task.value.toFixed(2)})</span>
                                </td>
                                {kidNames.map((_, kidIdx) => (
                                    <React.Fragment key={`kid-data-${kidIdx}-${task.id}`}>
                                        {daysOfWeek.map((_, dayIdx) => (
                                            <td key={dayIdx} className="px-2 py-3 whitespace-nowrap border-l border-blue-100 text-center">
                                                <div className="flex justify-center space-x-1">
                                                    {[0, 1, 2].map(checkboxIdx => (
                                                        <input
                                                            key={checkboxIdx}
                                                            type="checkbox"
                                                            checked={checkboxStates[kidIdx]?.[task.id]?.[dayIdx]?.[checkboxIdx] || false}
                                                            onChange={() => handleCheckboxChange(kidIdx, task.id, dayIdx, checkboxIdx)}
                                                            className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                        />
                                                    ))}
                                                </div>
                                            </td>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tr>
                        ))}
                        {/* Daily Totals Row */}
                        <tr className="bg-blue-50 font-bold">
                            <td className="px-3 py-3 whitespace-nowrap text-right text-sm text-blue-700 sticky left-0 bg-blue-50 border-r border-blue-100">Daily Total:</td>
                            {kidNames.map((_, kidIdx) => (
                                <React.Fragment key={`daily-total-${kidIdx}`}>
                                    {daysOfWeek.map((_, dayIdx) => (
                                        <td key={dayIdx} className="px-2 py-3 whitespace-nowrap text-center text-sm text-blue-700 border-l border-blue-100">
                                            ${dailyEarnings[kidIdx]?.[dayIdx]?.toFixed(2) || '0.00'}
                                        </td>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Summary Sections */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Weekly Summary */}
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-200">
                    <h2 className="text-2xl font-semibold text-blue-700 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                            <path d="M12 2v20"></path>
                            <path d="M17 5H7"></path>
                            <path d="M17 19H7"></path>
                            <path d="M18 10V6.5a2.5 2.5 0 0 0-5 0V10"></path>
                            <path d="M6 14v3.5a2.5 2.5 0 0 0 5 0V14"></path>
                        </svg>
                        Weekly Summary
                    </h2>
                    <ul className="space-y-2">
                        {kidNames.map((name, index) => (
                            <li key={index} className="flex justify-between items-center text-lg">
                                <span>{name}:</span>
                                <span className="font-semibold text-green-700">${weeklyEarnings[index]?.toFixed(2) || '0.00'}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Monthly Summary */}
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-200">
                    <h2 className="text-2xl font-semibold text-blue-700 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                            <line x1="12" y1="15" x2="12" y2="17"></line>
                            <line x1="8" y1="15" x2="8" y2="17"></line>
                            <line x1="16" y1="15" x2="16" y2="17"></line>
                        </svg>
                        Monthly Summary
                    </h2>
                    <ul className="space-y-2">
                        {kidNames.map((name, index) => (
                            <li key={index} className="flex justify-between items-center text-lg">
                                <span>{name}:</span>
                                <span className="font-semibold text-green-700">${monthlyTotalRef.current[index]?.toFixed(2) || '0.00'}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Cumulative Grand Total */}
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-blue-200">
                    <h2 className="text-2xl font-semibold text-blue-700 mb-4 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-blue-500">
                            <path d="M20 9V5.5L14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9"></path>
                            <path d="M10 10l-2 2l2 2"></path>
                            <path d="M14 10l2 2l-2 2"></path>
                            <line x1="12" y1="17" x2="12" y2="17"></line>
                        </svg>
                        Cumulative Total
                    </h2>
                    <ul className="space-y-2">
                        {kidNames.map((name, index) => (
                            <li key={index} className="flex justify-between items-center text-lg">
                                <span>{name}:</span>
                                <span className="font-bold text-blue-800 text-xl">${cumulativeEarnings[index]?.toFixed(2) || '0.00'}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Reset Button */}
            <div className="text-center mt-8">
                <button
                    onClick={resetScoreboard}
                    className="p-4 bg-purple-600 text-white rounded-xl shadow-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-purple-300"
                >
                    <span className="flex items-center justify-center text-lg font-semibold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                            <path d="M21.5 2v6h-6"></path>
                            <path d="M2.5 22v-6h6"></path>
                            <path d="M22 11.5A10 10 0 0 0 12.5 2c-5.5 0-10 4.5-10 10 0 1.9.6 3.7 1.5 5.3L2.5 22"></path>
                            <path d="M2 12.5a10 10 0 0 0 9.5 10c5.5 0 10-4.5 10-10 0-1.9-.6-3.7-1.5-5.3L21.5 2"></path>
                        </svg>
                        Reset Scoreboard for New Week
                    </span>
                </button>
                <p className="mt-2 text-sm text-gray-600">This will add current week's earnings to monthly totals and clear checkboxes for the new week.</p>
            </div>

            {/* User Instructions */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 p-4 rounded-lg mt-8 shadow-inner">
                <h3 className="font-bold text-lg mb-2">How to Use:</h3>
                <ul className="list-disc list-inside space-y-1">
                    <li>Edit "Kid Names" and "Tasks & Values" as needed. Click the "$" input to change task values.</li>
                    <li>For each task a child completes on a given day, check one, two, or all three checkboxes.</li>
                    <li>Daily, Weekly, Monthly, and Cumulative totals will update automatically.</li>
                    <li>At the end of the week or when you're ready for a new week, click "Reset Scoreboard for New Week". This moves the current week's earnings to the monthly total and clears the checkboxes for the next week.</li>
                </ul>
            </div>
        </div>
    );
};

export default App;
