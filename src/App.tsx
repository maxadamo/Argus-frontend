import React from "react";
import AlertView from "./views/alertView/AlertView";
import LoginView from "./views/loginView/LoginView";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import './variables.css';
import './colorscheme.css'
import { Store } from "./store";

const App: React.SFC = () => {
  return (
    <Router>
      <Switch>
        <React.Fragment>
          <Route exact path={'/'} component={AlertView} />
          <Route path={'/login'} component={LoginView} />
        </React.Fragment>
      </Switch>
    </Router>
  );
};

export default App;
