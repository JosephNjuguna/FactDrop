import { useEffect, useState } from "react";
import Facts from "./Home/Facts";
import { useAuth } from "../components/Helpers/AuthContext";


async function fetchRandomFact() {
    const res = await fetch("https://factfacts.com/api.php?count=1");
    if (!res.ok) {
        throw new Error("Failed to fetch fact");
    }
    const data = await res.json();
    console.log(data.fact);

    // Map the API's shape to what FactCard expects
    return { id: data.fact.id, text: data.fact.text, category: data.fact.category };
}

function Home() {
    const { user } = useAuth();
    const userEmail = user.email;


    const [facts, setFacts] = useState([]);
    const [factsError, setFactsError] = useState("");

    useEffect(() => {
        const fetchfacts = async () => {
            await fetch('https://factfacts.com/api.php?count=5')
                .then((res) => {
                    if (!res.ok) {
                        setFactsError('Failed to fetch facts data')
                        throw new Error();
                    }
                    return res.json();
                })
                .then((data) => {
                    setFacts(data.facts);
                    console.log(data.facts);
                })
                .catch((err) => {
                    setFactsError('Fetching Facts failed.')
                    console.log(err.message);
                });
        }
        fetchfacts()
    }, []);

    async function handleLiked(id) {
        setFacts((prev) => prev.filter((f) => f.id !== id));//filter out like fact from the ui.
        try {
            const next = await fetchRandomFact();
            setFacts((prev) =>
                prev.some((f) => f.id === next.id) ? prev : [...prev, next]
            );
        } catch (err) {
            console.error(err);
        }
    }

    return (
        <>
            <Facts facts={facts} updatelikedCard={handleLiked} userEmail={userEmail} />
            <p>this is home {factsError}</p>
        </>
    )
}
export default Home;