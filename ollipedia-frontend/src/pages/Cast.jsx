import { useEffect,useState } from "react";
import { API } from "../api/api";

export default function Cast(){

const [cast,setCast] = useState([]);

useEffect(()=>{
API.getCast().then(setCast)
},[])

return(

<div>

<h1>Actors</h1>

{cast.map(c=>(

<div key={c._id}>

<h3>{c.name}</h3>

</div>

))}

</div>

)
}