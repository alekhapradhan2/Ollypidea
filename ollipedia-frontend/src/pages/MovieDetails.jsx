import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { API } from "../api/api";

export default function MovieDetails(){

const {id} = useParams();

const [movie,setMovie] = useState(null);

useEffect(()=>{
API.getMovie(id).then(setMovie)
},[])

if(!movie) return <p>Loading...</p>

return(

<div>

<h1>{movie.title}</h1>

<p>Director: {movie.director}</p>

<p>Producer: {movie.producer}</p>

<p>Budget: {movie.budget}</p>

<h3>Cast</h3>

{movie.cast?.map(c=>(

<div key={c.name}>{c.name}</div>

))}

</div>

)
}