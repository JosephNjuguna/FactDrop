import { useState } from "react";
import FactCard from "./FactsCard";

function Facts({ facts, updatelikedCard }) {

    return (
        <div className="FactsList">
            <ul className="Facts">
                {facts.map((fact) => (
                    <FactCard key={fact.id} fact={fact} onLiked={updatelikedCard}/>
                ))}
            </ul>
        </div>
    );
}
export default Facts