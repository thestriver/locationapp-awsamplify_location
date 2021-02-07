import React, { useState, useEffect } from 'react';

import './App.css';

import ReactMapGL, {
  NavigationControl,
} from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import Amplify, { Auth } from 'aws-amplify';
import { Signer } from "@aws-amplify/core";

//for search
import Location from "aws-sdk/clients/location";

import awsconfig from './aws-exports';

// import logo from './logo.svg';

const mapName = "LocationAppMap";

Amplify.configure(awsconfig);

/**
 * Sign requests made by Mapbox GL using AWS SigV4.
 */
const transformRequest = (credentials) => (url, resourceType) => {
  // Resolve to an AWS URL
  if (resourceType === "Style" && !url?.includes("://")) {
    url = `https://maps.geo.${awsconfig.aws_project_region}.amazonaws.com/maps/v0/maps/${url}/style-descriptor`;
  }

  // Only sign AWS requests (with the signature as part of the query string)
  if (url?.includes("amazonaws.com")) {
    return {
      url: Signer.signUrl(url, {
        access_key: credentials.accessKeyId,
        secret_key: credentials.secretAccessKey,
        session_token: credentials.sessionToken,
      })
    };
  }

  // Don't sign
  return { url: url || "" };
};

function Search(props){

  const [place, setPlace] = useState('Los Angeles');
 
  const handleChange = (event) => {
    setPlace(event.target.value);
  }

  const handleClick = (event) => {
    event.preventDefault();
    props.searchPlace(place)
  }
  
  return (
    <div className="container">
      <div className="input-group">
        <input type="text" className="form-control form-control-lg" placeholder="Search for Places" aria-label="Place" aria-describedby="basic-addon2" value={ place } onChange={handleChange}/>
        <div className="input-group-append">
          <button onClick={ handleClick } className="btn btn-primary" type="submit"> 🔎 Search</button>
        </div>
      </div>
    </div>
  )
};

const App = () => {
  const [credentials, setCredentials] = useState(null);

  const [viewport, setViewport] = useState({
    longitude: -118.243683,
    latitude: 34.052235,
    zoom: 10,
  });

  const [client, setClient] = useState(null);
 

  useEffect(() => {
    const fetchCredentials = async () => {
      setCredentials(await Auth.currentUserCredentials());
    };

    fetchCredentials();

    const createClient = async () => {
      const credentials = await Auth.currentCredentials();
      const client = new Location({
          credentials,
          region: awsconfig.aws_project_region,
     });
     setClient(client);
    }

    createClient();
  }, []);

  const searchPlace = (place) => {

    const params = {
      IndexName: "LocationAppPlaceIndex",
      Text: place,
    };

    client.searchPlaceIndexForText(params, (err, data) => {
      if (err) console.error(err);
      if (data) {
        const coordinates = data.Results[0].Place.Geometry.Point;
        setViewport({
          longitude: coordinates[0],
          latitude: coordinates[1], 
          zoom: 10})
        return coordinates;
      }
    });
  }
{/* <p>A location/map React app built using AWS Amplify and Location services with a search functionality. ReactMapGL was used to display the coordinates.</p> */}

  return (
    <div id="body">
      <header>
        <h1>A Location App 🌍 <span>built with AWS Amplify and Amazon Location 📍 Services</span></h1>
      </header>
       <div id="search">
        <Search searchPlace = {searchPlace} /> 
      </div>

      {credentials ? (
        <ReactMapGL
          {...viewport}
          width="100%"
          height="100vh"
          transformRequest={transformRequest(credentials)}
          mapStyle={mapName}
          onViewportChange={setViewport}
        >
          <div style={{ position: "absolute", left: 20, top: 20 }}>
            {/* react-map-gl v5 doesn't support dragging the compass to change bearing */}
            <NavigationControl showCompass={false} />
          </div>
        </ReactMapGL>
      ) : (
        <h1>Loading...</h1>
      )}
    </div>
  );
};

export default App;
