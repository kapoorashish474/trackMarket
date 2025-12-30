import React from 'react';

function PlaceholderTab({ title, icon, message }) {
    return (
        <div className="placeholder-tab">
            <div className="placeholder-content">
                <div className="placeholder-icon">{icon}</div>
                <h2>{title}</h2>
                <p>{message || "This feature is coming soon!"}</p>
                <div className="placeholder-hint">
                    We are currently gathering historical data for this section.
                </div>
            </div>
        </div>
    );
}

export default PlaceholderTab;
