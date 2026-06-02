export default function LoadingSpinner() {

    return (

        // Full Screen overlay with semi-transaprent background
        <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
            <div className="text-center">

                {/* Spinner */}
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>

                <p className="text-gray-600 font-medium">Analysing your financial profile...</p>
                <p className="text-gray-400 text-sm mt-1">This may take a few moments.</p>

            </div>
        </div>
    )
}