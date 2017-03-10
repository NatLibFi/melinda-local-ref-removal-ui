import React from 'react';
import '../../styles/components/navbar.scss';

export class NavBar extends React.Component {

  static propTypes = {
    onLogout: React.PropTypes.func.isRequired,
    appTitle: React.PropTypes.string.isRequired,
    username: React.PropTypes.string
  }

  componentDidMount() {
    
    window.$('.nav-dropdown').dropdown({
      inDuration: 300,
      outDuration: 300,
      constrain_width: false,
      hover: false,
      gutter: 0,
      belowOrigin: true,
      alignment: 'right'
    });
  }

  render() {
    const { username, appTitle } = this.props;

    return (
      <div className="navbar">
        <nav> 
          <div className="nav-wrapper">
            <ul id="nav" className="left">
              <li className="heading">{appTitle}</li>
            </ul>        
            <ul id="nav" className="right">
              <li><a className="nav-dropdown" href="#" data-activates="mainmenu" ref={(c) => this._dropdown = c} onClick={this.preventDefault}>
              <i className="material-icons right">more_vert</i>{username ? username : ''}</a></li>
            </ul>
          </div>
        </nav>

        <ul id='mainmenu' className='dropdown-content'>
          <li><a href="https://www.kiwi.fi/display/melinda/Tietokantatunnusten+massapoisto+Melindasta" target="_blank">Ohjeet</a></li>
          <li className="divider" />
          <li><a href="#" onClick={this.props.onLogout}>Kirjaudu ulos</a></li>
        </ul>
      </div>
    );
  }
} 
