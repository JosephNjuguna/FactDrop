import { useState } from "react";
import FactCard from "./FactsCard";

function Facts({ facts, updatelikedCard,  userEmail, factsError }) {

    return (
        <div className="FactsList">
            <ul className="Facts">
                {facts.map((fact) => (
                    <FactCard key={fact.id} fact={fact} onLiked={updatelikedCard} userEmail={userEmail}/>
                ))}
            </ul>
            <p>{factsError}</p>
        </div>
    );
}
export default Facts