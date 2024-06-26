import {
  ArrowDropDown,
  ArrowDropUp,
  MyLocation,
  Search,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  InputAdornment,
  Pagination,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material'
import { Stack } from '@mui/system'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import {
  resetFilters,
  searchAuthorizationsByGlobalFilter,
  setExpand,
  setFilters,
  setFilteredValue,
  setLocation,
  setPage,
  setSearchBy,
} from '@/features/omrr/omrr-slice'
import { useNavigate } from 'react-router'
import { useTheme } from '@mui/material/styles'
import useMediaQuery from '@mui/material/useMediaQuery'
import { MutableRefObject, useEffect, useState, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import * as turf from '@turf/turf'

export default function AuthorizationMap() {
  const mapContainer: MutableRefObject<null | HTMLDivElement> = useRef(null)
  const [map, setMap] = useState<any | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  const theme = useTheme()
  const mdMatches = useMediaQuery(theme.breakpoints.up('md'))
  const navigate = useNavigate()
  const buttonClicked = (route: any, data: any) => {
    navigate(route, { state: { data: data } }) // reset the state
  }
  const dispatch = useDispatch()
  const {
    filteredValue,
    expand,
    notificationFilter,
    permitFilter,
    approvalFilter,
    compostFacilityFilter,
    landApplicationBioSolidsFilter,
    operationalCertificateFilter,
    location,
    searchBy,
    page,
    globalTextSearchFilter,
    compostFacilityFilterDisabled,
    landApplicationBioSolidsFilterDisabled,
    lastModified,
  } = useSelector((state: RootState) => state.omrr)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current!,
      style:
        'https://api.maptiler.com/maps/openstreetmap/style.json?key=l0YRm3kb0FVo9JhCP3Ia',
      center: [-127.6476, 53.7267],
      zoom: 4,
      attributionControl: false,
    })

    setMap(map)

    const geoJson = {
      type: 'FeatureCollection',
      features: filteredValue.map((item) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [item.Longitude, item.Latitude],
        },
        properties: { ...item },
      })),
    }

    map.on('load', () => {
      map.addSource('points', {
        type: 'geojson',
        data: geoJson,
      })

      map.addLayer({
        id: 'points',
        type: 'circle',
        source: 'points',
        paint: {
          'circle-radius': 6,
          'circle-color': '#053662',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      })

      map.on('click', 'points', (e) => {
        const coordinates = e.features[0].geometry.coordinates.slice()
        const description = e.features[0].properties
        const authNumber = description['Authorization Number']

        const propertyElements = description
          ? Object.entries(description)
              .map(([key, value]) => {
                return `<div ><strong>${key}:</strong> ${value}</div>`
              })
              .join('')
          : ''

        const html = ` <div id="popupfacilities">${propertyElements}</div>`

        new maplibregl.Popup().setLngLat(coordinates).setHTML(html).addTo(map)
      })

      const draw = new MapboxDraw({
        displayControlsDefault: false,
      })

      // 1 Draw and its layer
      map.addControl(draw)
      map.draw = draw

      map.on('draw.create', function (event) {
        console.log(map, 'map when drawing')
        const feature = event.features
        const geometry = feature[0].geometry
        const type_of_geometry = feature[0].geometry.type

        if (type_of_geometry === 'Polygon') {
          const coordinates = geometry.coordinates[0]
          const geojsonCoordinates = coordinates.map((coord) => [
            coord[0],
            coord[1],
          ])
          const wktCoordinates = coordinates
            .map((coord) => `${coord[0]} ${coord[1]}`)
            .join(', ')
          const wktCoordinates_final = `POLYGON ((${wktCoordinates}))`
          console.log(wktCoordinates_final, 'wkt polygon ')

          const geojson1 = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [geojsonCoordinates],
                  properties: {},
                },
              },
            ],
          }
          console.log(geojson1, 'geojson1')
          const poly1 = turf.polygon([geojsonCoordinates])

          const geojson2 = map.getSource('points')._data
          console.log(geojson2, 'geojson')

          const filterValueNew = filteredValue.filter((item) => {
            const point = turf.point([item.Longitude, item.Latitude])
            const intersection = turf.booleanIntersects(poly1, point)
            if (intersection) {
              return item
            }
          })

          console.log(filterValueNew, 'filterValueNew')
          dispatch(setFilteredValue(filterValueNew))

          // const filteredGeojson2 = {
          //   type: 'FeatureCollection',
          //   features: geojson2.features.filter((feature) => {
          //     const intersection = turf.booleanIntersects(poly1, feature)
          //     console.log(intersection, 'intersection')
          //     if (intersection) {
          //       return feature
          //     }
          //   }),
          // }
          // console.log(filteredGeojson2, 'filteredGeojson2')
        }
      })
      map.on('draw.update', function updateFunctionProject(event) {
        console.log('draw update event listner from map')
        // const draw = map.draw;
        console.log(draw, 'draw update from layer control panel')
        const feature = event.features
        const geometry = feature[0].geometry
        const type_of_geometry = feature[0].geometry.type
        if (type_of_geometry === 'Polygon') {
          const coordinates = geometry.coordinates[0]
          const geojsonCoordinates = coordinates.map((coord) => [
            coord[0],
            coord[1],
          ])
          const wktCoordinates = coordinates
            .map((coord) => `${coord[0]} ${coord[1]}`)
            .join(', ')
          const wktCoordinates_final = `POLYGON ((${wktCoordinates}))`
          console.log(wktCoordinates_final, 'wkt polygon ')
          const poly1 = turf.polygon([geojsonCoordinates])

          const filterValueNew = filteredValue.filter((item) => {
            const point = turf.point([item.Longitude, item.Latitude])
            const intersection = turf.booleanIntersects(poly1, point)
            if (intersection) {
              return item
            }
          })

          console.log(filterValueNew, 'filterValueNew')
          dispatch(setFilteredValue(filterValueNew))
        }
      })

      map.on('mouseenter', 'points', () => {
        map.getCanvas().style.cursor = 'pointer'
      })

      map.on('mouseleave', 'points', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    return () => {
      map.remove()
    }
  }, [])

  const handleDraw = () => {
    const draw = map.draw
    draw.deleteAll()

    const type_of_geometry = 'Polygon'
    if (type_of_geometry === 'Polygon') {
      draw.changeMode('draw_polygon')
    }
  }

  const handleCancelDraw = () => {
    const draw = map.draw
    draw.deleteAll()
    dispatch(setSearchBy('all'))
  }

  useEffect(() => {
    if (!map) return

    const geoJson = {
      type: 'FeatureCollection',
      features: filteredValue.map((item) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [item.Longitude, item.Latitude],
        },
        properties: { ...item },
      })),
    }
    if (map) {
      const popups = document.getElementsByClassName('maplibregl-popup')

      if (popups.length) {
        popups[0].remove()
      }

      map.getSource('points')?.setData(geoJson)
      if (geoJson.features.length) {
        const extent = turf.bbox(geoJson)
        // map.fitBounds(extent, {
        //   padding: {
        //     top: 50,
        //     bottom: 50,
        //     left: 50,
        //     right: 50,
        //   },
        // })
      }
    }
  }, [filteredValue])

  return (
    <Grid container spacing={2} sx={{ marginTop: '1vh' }}>
      <Grid item xs={12}>
        <Grid container spacing={2}>
          <Grid
            position={'absolute'}
            top={'70px'}
            left={'10px'}
            sx={{
              backgroundColor: 'white',
              padding: '1em',
              margin: '0px',
              borderRadius: '25px',
              zIndex: 100,
            }}
          >
            <Grid item xs={12}>
              <TextField
                sx={{
                  minWidth: '100%',
                  color: '#9F9D9C',
                  marginBottom: '1.5em',
                }}
                label="Search Authorizations"
                data-testid="auth-list-search-authorizations-textfield"
                value={globalTextSearchFilter}
                onChange={(event) =>
                  dispatch(
                    searchAuthorizationsByGlobalFilter(event.target.value),
                  )
                }
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              ></TextField>
            </Grid>
            <Grid item xs={12}>
              <Grid
                container
                sx={{ maxWidth: '100%' }}
                justifyContent="space-between"
                spacing={0}
                direction={{ xs: 'column', sm: 'row' }}
              >
                <Grid position={'relative'} sx={{}}>
                  <Button
                    sx={{
                      marginTop: {
                        xs: '1.5em',
                        sm: '0',
                      },
                      padding: '0.6em 1.125em',
                      background: '#053662',
                      color: '#ffffff',
                      borderRadius: '4px',
                      textTransform: 'none',
                      order: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      height: '100%',
                      alignSelf: {
                        sm: 'center',
                      },
                      '&:hover': {
                        background: '#053662',
                        color: '#ffffff',
                        boxShadow: 'none',
                      },
                    }}
                    onClick={() => dispatch(setExpand(!expand))}
                  >
                    Filter by Facility Type{' '}
                    {expand ? <ArrowDropUp /> : <ArrowDropDown />}
                  </Button>

                  {expand && (
                    <Grid
                      position={'absolute'}
                      top={'100%'}
                      left={'0'}
                      sx={{
                        backgroundColor: 'white',
                        padding: '1em',
                        margin: '0px',
                        borderRadius: '25px',
                        zIndex: 100,
                      }}
                      item
                      xs={12}
                    >
                      <Grid item xs={12}>
                        <Grid
                          container
                          spacing={0.5}
                          direction={{ xs: 'column', sm: 'column' }}
                        >
                          <Grid item xs={12} sm={4} md={3}>
                            <FormControlLabel
                              checked={notificationFilter}
                              control={<Checkbox />}
                              label="Notification"
                              onClick={() =>
                                dispatch(setFilters('notification'))
                              }
                            />
                          </Grid>
                          <Grid item xs={12} sm={4} md={3}>
                            <FormControlLabel
                              control={<Checkbox />}
                              checked={permitFilter}
                              label="Permit"
                              onClick={() => dispatch(setFilters('permit'))}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4} md={3}>
                            <FormControlLabel
                              checked={approvalFilter}
                              control={<Checkbox />}
                              label="Approval"
                              onClick={() => dispatch(setFilters('approval'))}
                            />
                          </Grid>
                          <Grid item xs={12} sm={4} md={3}>
                            <FormControlLabel
                              checked={operationalCertificateFilter}
                              control={<Checkbox />}
                              label="Operational Certificate"
                              onClick={() =>
                                dispatch(setFilters('operationalCertificate'))
                              }
                            />
                          </Grid>
                          <Grid item xs={12} sm={4} md={3}>
                            <FormControlLabel
                              checked={compostFacilityFilter}
                              control={<Checkbox />}
                              disabled={compostFacilityFilterDisabled}
                              label="Compost Production Facility"
                              onClick={() =>
                                dispatch(setFilters('compostFacility'))
                              }
                            />
                          </Grid>
                          <Grid item xs={12} sm={4} md={3}>
                            <FormControlLabel
                              checked={landApplicationBioSolidsFilter}
                              control={<Checkbox />}
                              disabled={landApplicationBioSolidsFilterDisabled}
                              label="Land Application of Biosolids"
                              onClick={() =>
                                dispatch(setFilters('landApplicationBioSolids'))
                              }
                            />
                          </Grid>
                        </Grid>
                      </Grid>
                      <Grid item xs={12}>
                        <Grid
                          container
                          spacing={3}
                          direction="row"
                          sx={{ marginTop: '0.1em' }}
                        >
                          <Grid item xs={12}>
                            <Button
                              sx={{
                                border: '1px solid #353433',
                                borderRadius: '4px',
                                textTransform: 'none',
                              }}
                              variant="contained"
                              color="secondary"
                              onClick={() => dispatch(resetFilters())}
                            >
                              Reset Filters
                            </Button>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  )}
                </Grid>
                <Button
                  sx={{
                    marginRight: '1em',
                    marginTop: {
                      xs: '1.5em',
                      sm: '0',
                    },
                    padding: '0.2em 1.125em',
                    background: '#053662',
                    color: '#ffffff',
                    borderRadius: '4px',
                    textTransform: 'none',
                    order: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    height: '100%',
                    alignSelf: {
                      sm: 'center',
                    },
                    '&:hover': {
                      background: '#053662',
                      color: '#ffffff',
                      boxShadow: 'none',
                    },
                  }}
                  onClick={handleCancelDraw}
                >
                  Cancel Draw
                </Button>
                <Button
                  sx={{
                    marginTop: {
                      xs: '1.5em',
                      sm: '0',
                    },
                    padding: '0.2em 1.125em',
                    background: '#053662',
                    color: '#ffffff',
                    borderRadius: '4px',
                    textTransform: 'none',
                    order: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    height: '100%',
                    alignSelf: {
                      sm: 'center',
                    },
                    '&:hover': {
                      background: '#053662',
                      color: '#ffffff',
                      boxShadow: 'none',
                    },
                  }}
                  onClick={handleDraw}
                >
                  Draw
                </Button>
                <Stack
                  sx={{
                    display: 'flex',
                    alignItems: 'left',
                    flexDirection: 'row',
                    marginLeft: '1em',

                    justifyContent: 'left',
                  }}
                  direction={{ xs: 'column', md: 'row' }}
                >
                  <Box
                    display="flex"
                    alignItems="center"
                    sx={{ marginRight: '2em' }}
                  >
                    <span>Search by: </span>
                  </Box>
                  <Box display="flex" alignItems="left">
                    <RadioGroup
                      row
                      name="searchBy"
                      defaultValue="active"
                      value={searchBy}
                    >
                      <FormControlLabel
                        value="all"
                        control={<Radio />}
                        label="All"
                        onClick={() => dispatch(setSearchBy('all'))}
                      />
                      <FormControlLabel
                        value="active"
                        control={<Radio />}
                        label="Active"
                        onClick={() => dispatch(setSearchBy('active'))}
                      />
                      <FormControlLabel
                        value="inactive"
                        control={<Radio />}
                        label="Inactive"
                        onClick={() => dispatch(setSearchBy('inactive'))}
                      />
                    </RadioGroup>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Grid>

          {/* <Grid container spacing={3}> */}
          <div
            ref={mapContainer}
            id="map-malibre"
            className="map-maplibre-container"
          ></div>
        </Grid>
      </Grid>
    </Grid>
  )
}
