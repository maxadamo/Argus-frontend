import React, { useEffect, useState, useMemo } from "react";
// import "./incidenttable.css";
import "react-table/react-table.css";

import Button from "@material-ui/core/Button";
import SaveIcon from "@material-ui/icons/Save";
import Grid from "@material-ui/core/Grid";

import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";

import Chip from "@material-ui/core/Chip";

import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";

import TextField from "@material-ui/core/TextField";
import Typography from "@material-ui/core/Typography";

import Skeleton from "@material-ui/lab/Skeleton";

import { useStateWithDynamicDefault } from "../../utils";
import { formatDuration, formatTimestamp, isValidUrl } from "../../utils";

import CenterContainer from "../../components/centercontainer";

import api from "../../api";

import {
  Event,
  EventType,
  Incident,
  IncidentTag,
  IncidentTicketUrlBody,
  Acknowledgement,
  AcknowledgementBody,
} from "../../api/types.d";

import SignedMessage from "./SignedMessage";
import { useStyles } from "./styles";
import ManualClose from "./ManualCloseSignOffAction";
import CreateAck from "./CreateAckSignOffAction";

import { AckedItem, LevelItem, OpenItem, TicketItem } from "./Chips";

// Contexts/Hooks
import { useAlerts } from "../alertsnackbar";
import { useApiIncidentAcks, useApiIncidentEvents } from "../../api/hooks";
import { SHOW_SEVERITY_LEVELS } from "../../config";
import { Alert } from "@material-ui/lab";

import "./IncidentDetails.css";
import {Hidden} from "@material-ui/core";
type IncidentDetailsListItemPropsType = {
  title: string;
  detail: string | React.ReactNode;
};

const IncidentDetailsListItem: React.FC<IncidentDetailsListItemPropsType> = ({
  title,
  detail,
}: IncidentDetailsListItemPropsType) => {
  return (
    <ListItem>
      <ListItemText primary={title} secondary={detail} />
    </ListItem>
  );
};

type EventListItemPropsType = {
  event: Event;
};

const EventListItem: React.FC<EventListItemPropsType> = ({ event }: EventListItemPropsType) => {
  const classes = useStyles();
  return (
    <div className={classes.message}>
      <SignedMessage
        message={event.description}
        timestamp={event.timestamp}
        username={event.actor.username}
        content={
          <ListItemText
            primary={event.type.display}
            secondary={<Typography paragraph>{event.description}</Typography>}
          />
        }
      />
    </div>
  );
};

type Tag = {
  key: string;
  value: string;
};

type TagChipPropsType = {
  tag: Tag;
  small?: boolean;
};

const hyperlinkIfAbsoluteUrl = (url: string, title?: string) => {
  const urlTitle = title || url;
  if (isValidUrl(url)) {
    return <a href={url}>{urlTitle}</a>;
  } else {
    return url;
  }
};

const TagChip: React.FC<TagChipPropsType> = ({ tag, small }: TagChipPropsType) => {
  if (isValidUrl(tag.value)) {
    return (
      <Chip
        size={(small && "small") || undefined}
        label={`${tag.key}=${tag.value}`}
        component="a"
        href={tag.value}
        clickable
      />
    );
  }
  return <Chip size={(small && "small") || undefined} label={`${tag.key}=${tag.value}`} />;
};

type TicketModifiableFieldPropsType = {
  url?: string;
  saveChange: (newUrl?: string) => void;
};

const TicketModifiableField: React.FC<TicketModifiableFieldPropsType> = ({
  url: urlProp,
  saveChange,
}: TicketModifiableFieldPropsType) => {
  const classes = useStyles();

  const [changeUrl, setChangeUrl] = useState<boolean>(false);
  const [url, setUrl] = useStateWithDynamicDefault<string | undefined>(urlProp);
  const [invalidAbsoluteUrl, setInvalidAbsoluteUrl] = useState<boolean>(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
    setChangeUrl(true);
  };

  const handleSave = () => {
    // If url is empty string ("") store it as undefined.
    if (url && changeUrl && !isValidUrl(url)) {
      setInvalidAbsoluteUrl(true);
    } else if (changeUrl) {
      saveChange(url || undefined);
      setInvalidAbsoluteUrl(false);
      setChangeUrl(false);
    }
  };

  return (
    <ListItem>
      <Grid container direction="row" wrap="wrap">
        <Grid item container direction="row" wrap="nowrap" justify="space-between" className="ticket-input-button-container">
          <TextField
            label="Ticket"
            value={url || ""}
            onChange={handleChange}
            error={invalidAbsoluteUrl}
            helperText={invalidAbsoluteUrl && "Invalid absolute URL"}
            className="ticket-url-input-field"
          />
          {changeUrl && (
            <Button className={classes.safeButton} endIcon={<SaveIcon />} onClick={handleSave}>
              Save
            </Button>
          )}
        </Grid>
        {changeUrl && (
          <Grid item>
            <Alert severity="info">Leave this field empty in order to remove ticket urls from the selected incidents</Alert>
          </Grid>
        )}
      </Grid>
    </ListItem>
  );
};

type AckListItemPropsType = {
  ack: Acknowledgement;
};

const AckListItem: React.FC<AckListItemPropsType> = ({ ack }: AckListItemPropsType) => {
  const classes = useStyles();

  const ackDate = new Date(ack.event.timestamp);
  const formattedAckDate = formatTimestamp(ackDate, { withSeconds: true });

  let hasExpired = false;
  let expiresMessage;
  if (ack.expiration) {
    const date = new Date(ack.expiration);
    if (Date.parse(ack.expiration) < Date.now()) {
      expiresMessage = `Expired ${formatTimestamp(date, { withSeconds: true })}`;
      hasExpired = true;
    } else {
      expiresMessage = `Expires ${formatTimestamp(date, { withSeconds: true })}`;
    }
  }

  return (
    <div className={classes.message}>
      <SignedMessage
        message={ack.event.description}
        timestamp={formattedAckDate}
        username={ack.event.actor.username}
        content={
          <ListItemText
            primary={expiresMessage || ""}
            secondary={
              <Typography paragraph style={{ textDecoration: hasExpired ? "line-through" : "none" }}>
                {ack.event.description}
              </Typography>
            }
          />
        }
      />
    </div>
  );
};

type IncidentDetailsPropsType = {
  incident: Incident;
  onIncidentChange: (incident: Incident) => void;
  showTitle?: boolean;
};

const IncidentDetails: React.FC<IncidentDetailsPropsType> = ({
  incident,
  onIncidentChange,
  showTitle,
}: IncidentDetailsPropsType) => {
  const classes = useStyles();
  const displayAlert = useAlerts();

  const [{ result: acks, isLoading: isAcksLoading }, setAcksPromise] = useApiIncidentAcks();
  const [{ result: events, isLoading: isEventsLoading }, setEventsPromise] = useApiIncidentEvents();

  useEffect(() => {
    setAcksPromise(api.getIncidentAcks(incident.pk));
    setEventsPromise(api.getIncidentEvents(incident.pk));
  }, [setAcksPromise, setEventsPromise, incident]);

  const chronoAcks = useMemo<Acknowledgement[]>(() => {
    return [...(acks || [])].sort((first: Acknowledgement, second: Acknowledgement) => {
      const firstTime = Date.parse(first.event.timestamp);
      const secondTime = Date.parse(second.event.timestamp);
      if (firstTime < secondTime) {
        return 1;
      } else if (firstTime > secondTime) {
        return -1;
      }
      if (first.expiration && second.expiration) {
        const firstExpires = Date.parse(first.expiration);
        const secondExpires = Date.parse(second.expiration);
        return firstExpires < secondExpires ? 1 : firstExpires > secondExpires ? -1 : 0;
      }
      return first.expiration ? 1 : -1;
    });
  }, [acks]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleManualClose = (msg: string) => {
    api
      .postIncidentCloseEvent(incident.pk, msg)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .then((event: Event) => {
        // TODO: add close event to list of events
        displayAlert(`Closed incident ${incident && incident.pk}`, "success");
        onIncidentChange({ ...incident, open: false });
      })
      .catch((error) => {
        displayAlert(`Failed to close incident ${incident && incident.pk} - ${error}`, "error");
      });
  };

  const handleManualOpen = () => {
    api
      .postIncidentReopenEvent(incident.pk)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .then((event: Event) => {
        // TODO: add open event to list of events
        displayAlert(`Reopened incident ${incident && incident.pk}`, "success");
        onIncidentChange({ ...incident, open: true });
      })
      .catch((error) => {
        displayAlert(`Failed to reopen incident ${incident && incident.pk} - ${error}`, "error");
      });
  };

  const ackExpiryDate = undefined;

  // TODO: get tag from incident
  const tags = useMemo(
    () =>
      incident.tags.map((tag: IncidentTag) => {
        const [key, value] = tag.tag.split("=", 2);
        return { key, value };
      }),
    [incident],
  );

  // These are just used for "skeletons" that are displayed
  // when the data is loading.
  const defaultEvent: Event = {
    pk: 1,
    incident: 1,
    actor: { pk: 2, username: "test" },
    timestamp: "2011-11-11T11:11:11+02:00",
    type: {
      value: EventType.INCIDENT_START,
      display: "Incident start",
    },
    description: "",
  };

  const defaultAck: Acknowledgement = {
    pk: 1,
    event: defaultEvent,
    expiration: "2020-02-14T03:04:14.387000+01:00",
  };

  return (
    <div className={classes.root}>
      {showTitle && (
        <Typography
          style={{ marginBottom: "1.5rem" }}
          align="center"
          gutterBottom
          variant="h5"
        >{`${incident.pk}: ${incident.description}`}</Typography>
      )}

      <Grid container spacing={3} className={`${classes.grid} incident-detailed-lg`}>
        <Grid container item spacing={2} md alignItems="stretch" direction="column">
          <Grid item>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Status
                </Typography>
                <Grid container spacing={1} direction="column">
                  {SHOW_SEVERITY_LEVELS && (
                    <Grid item>
                      <LevelItem level={incident.level} />
                    </Grid>
                  )}
                  <Grid item>
                    <OpenItem open={incident.open} />
                    <AckedItem acked={incident.acked} expiration={ackExpiryDate} />
                  </Grid>
                  <Grid item>
                    <TicketItem ticketUrl={incident.ticket_url} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Tags
                </Typography>
                {tags.map((tag: Tag) => (
                  <TagChip key={tag.key} tag={tag} />
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Primary details (#{incident.pk})
                </Typography>
                <List>
                  <IncidentDetailsListItem title="Description" detail={incident.description} />
                  <IncidentDetailsListItem
                    title="Start time"
                    detail={formatTimestamp(incident.start_time, { withSeconds: true })}
                  />
                  {incident.stateful && (
                    <IncidentDetailsListItem
                      title="Duration"
                      detail={formatDuration(incident.start_time, incident.end_time || undefined)}
                    />
                  )}
                  <IncidentDetailsListItem title="Source" detail={incident.source.name} />
                  <IncidentDetailsListItem
                    title="Details URL"
                    detail={hyperlinkIfAbsoluteUrl(incident.details_url) || "–"}
                  />

                  <TicketModifiableField
                    url={incident.ticket_url}
                    saveChange={(url?: string) => {
                      // TODO: api
                      api
                        .patchIncidentTicketUrl(incident.pk, url || "")
                        // eslint-disable-next-line @typescript-eslint/camelcase
                        .then(({ ticket_url }: IncidentTicketUrlBody) => {
                          displayAlert(`Updated ticket URL for ${incident.pk}`, "success");

                          // eslint-disable-next-line @typescript-eslint/camelcase
                          onIncidentChange({ ...incident, ticket_url });
                        })
                        .catch((error) => {
                          displayAlert(`Failed to updated ticket URL ${error}`, "error");
                        });
                    }}
                  />
                  <ListItem>
                    <CenterContainer>
                      <ManualClose
                        open={incident.open}
                        onManualClose={handleManualClose}
                        onManualOpen={handleManualOpen}
                      />
                    </CenterContainer>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container item spacing={2} md direction="column">
          <Grid item>
            <Typography color="textSecondary" gutterBottom>
              Acknowledgements
            </Typography>
            <List>
              {chronoAcks
                .map((ack: Acknowledgement) =>
                  <AckListItem key={ack.event.timestamp} ack={ack} />)
              }
            </List>
            <CenterContainer>
              <CreateAck
                key={(acks || []).length}
                onSubmitAck={(ack: AcknowledgementBody) => {
                  api
                    .postAck(incident.pk, ack)
                    .then((ack: Acknowledgement) => {
                      displayAlert(`Submitted ${ack.event.type.display} for ${incident && incident.pk}`, "success");
                      // NOTE: this assumes that nothing about the incident
                      // changes in the backend response other than the acked
                      // field, which may not be true in the future.
                      onIncidentChange({ ...incident, acked: true });
                    })
                    .catch((error) => {
                      displayAlert(`Failed to post ack ${error}`, "error");
                    });
                }}
              />
            </CenterContainer>
          </Grid>
        </Grid>
        <Grid container item spacing={2} md direction="column">
          <Grid item>
            <Typography color="textSecondary" gutterBottom>
              Related events
            </Typography>
            <List>
              {(events || [])
                  .filter((event: Event) => event.type.value !== "ACK")
                  .map((event: Event) => <EventListItem key={event.pk} event={event} />)
              }
            </List>
          </Grid>
        </Grid>
      </Grid>

      <Hidden only={["md", "lg", "xl"]}>
        <Grid container spacing={3} className={`${classes.grid} incident-detailed-sm`}>
          <Grid container item spacing={2} lg direction="column">
            <Grid item>
              <Typography color="textSecondary" gutterBottom>
                Status
              </Typography>
              <Grid container spacing={0} direction="row" wrap="wrap" alignItems="baseline" alignContent="stretch">
                {SHOW_SEVERITY_LEVELS && (
                  <Grid item>
                    <LevelItem level={incident.level} />
                  </Grid>
                )}
                <Grid item>
                  <OpenItem open={incident.open} />
                </Grid>
                <Grid item>
                  <AckedItem acked={incident.acked} expiration={ackExpiryDate} />
                </Grid>
                <Grid item>
                  <TicketItem ticketUrl={incident.ticket_url} />
                </Grid>
              </Grid>
            </Grid>

            <Grid item>
              <Typography color="textSecondary" gutterBottom>
                Tags
              </Typography>
              <Grid container spacing={0} direction="row" wrap="wrap" alignItems="baseline" alignContent="stretch">
                {tags.map((tag: Tag) => (
                  <Grid item>
                    <TagChip key={tag.key} tag={tag} />
                  </Grid>
                ))}
              </Grid>
            </Grid>

            <Grid item className="primary-details-container-sm">
              <Typography color="textSecondary" gutterBottom>
                Primary details (#{incident.pk})
              </Typography>
              <Grid className="primary-details-container-sm" container alignItems="baseline" alignContent="stretch" spacing={0} wrap="wrap">
                <Grid item sm={6} xs={12}>
                  <IncidentDetailsListItem title="Description" detail={incident.description} />
                </Grid>
                <Grid item sm={6} xs={12}>
                  <IncidentDetailsListItem
                    title="Start time"
                    detail={formatTimestamp(incident.start_time, { withSeconds: true })}
                  />
                </Grid>
                {incident.stateful && (
                  <Grid item sm={6} xs={12}>
                    <IncidentDetailsListItem
                      title="Duration"
                      detail={formatDuration(incident.start_time, incident.end_time || undefined)}
                    />
                  </Grid>
                )}
                <Grid item sm={6} xs={12}>
                  <IncidentDetailsListItem title="Source" detail={incident.source.name} />
                </Grid>
                <Grid item sm={6} xs={12}>
                  <IncidentDetailsListItem
                    title="Details URL"
                    detail={hyperlinkIfAbsoluteUrl(incident.details_url) || "–"}
                  />
                </Grid>
              </Grid>
            </Grid>

            <Grid item>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Actions
                  </Typography>
                  <Grid container spacing={1} direction="row" wrap="wrap" justify="center" alignItems="center" alignContent="stretch">
                    <Grid item sm={12} className="add-ticket-container">
                      <TicketModifiableField
                        url={incident.ticket_url}
                        saveChange={(url?: string) => {
                          // TODO: api
                          api
                            .patchIncidentTicketUrl(incident.pk, url || "")
                            // eslint-disable-next-line @typescript-eslint/camelcase
                            .then(({ ticket_url }: IncidentTicketUrlBody) => {
                              displayAlert(`Updated ticket URL for ${incident.pk}`, "success");

                              // eslint-disable-next-line @typescript-eslint/camelcase
                              onIncidentChange({ ...incident, ticket_url });
                            })
                            .catch((error) => {
                              displayAlert(`Failed to updated ticket URL ${error}`, "error");
                            });
                        }}
                      />
                    </Grid>
                    <Grid item className="close-button-container">
                      <ManualClose
                        open={incident.open}
                        onManualClose={handleManualClose}
                        onManualOpen={handleManualOpen}
                      />
                    </Grid>
                    <Grid item className="ack-button-container">
                      <CreateAck
                        key={(acks || []).length}
                        onSubmitAck={(ack: AcknowledgementBody) => {
                          api
                            .postAck(incident.pk, ack)
                            .then((ack: Acknowledgement) => {
                              displayAlert(`Submitted ${ack.event.type.display} for ${incident && incident.pk}`, "success");
                              // NOTE: this assumes that nothing about the incident
                              // changes in the backend response other than the acked
                              // field, which may not be true in the future.
                              onIncidentChange({ ...incident, acked: true });
                            })
                            .catch((error) => {
                              displayAlert(`Failed to post ack ${error}`, "error");
                            });
                        }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item>
              <Typography color="textSecondary" gutterBottom>
                Acknowledgements
              </Typography>
              <List>
                {(isAcksLoading &&
                  Array.from(new Array(3)).map((item: number, index: number) => (
                    <Skeleton key={index} variant="rect" animation="wave">
                      {" "}
                      <AckListItem ack={defaultAck} />
                    </Skeleton>
                  ))) ||
                chronoAcks.map((ack: Acknowledgement) => <AckListItem key={ack.event.timestamp} ack={ack} />)}
              </List>
            </Grid>

            <Grid item>
              <Typography color="textSecondary" gutterBottom>
                Related events
              </Typography>
              <List>
                {(isEventsLoading &&
                  Array.from(new Array(3)).map((item: number, index: number) => (
                    <Skeleton key={index} variant="rect" animation="wave">
                      {" "}
                      <EventListItem event={defaultEvent} />
                    </Skeleton>
                  ))) ||
                (events || [])
                  .filter((event: Event) => event.type.value !== "ACK")
                  .map((event: Event) => <EventListItem key={event.pk} event={event} />)}
              </List>
            </Grid>
          </Grid>
        </Grid>
      </Hidden>
    </div>
  );
};

export default IncidentDetails;
