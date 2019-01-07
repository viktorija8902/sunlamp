/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import { Text, Platform, View, StyleSheet, Picker, Button } from 'react-native';
import BluetoothSerial from 'react-native-bluetooth-serial';


const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload u,\n' +
    'Shake or press menu button for dev menu',
});

type Props = {};
export default class App extends Component<Props> {
    state = {
    day: '',
    hour: '',
    minute: '',
  };

  componentDidMount() {
    console.log("mounted")
    BluetoothSerial.on('read', (data) => {
      console.log('Reading data: ', data)
    })
  }

  renderOptionsFrom = options =>
    options.map(option => <Picker.Item key={option.toString()} label={option.toString()} value={option} />);

  renderDefaultValue = value => <Picker.Item label={`Select ${value}`} value="not selected"/>;

  getSchedules = () => {
    console.log("CLICKED")
    return BluetoothSerial.list()
         .then(data => {
            console.log("data", data)
            const id = data.find(device => device.name === "SUNLAMP").id;
            return BluetoothSerial.connect(id)
        }).then(() => {
            BluetoothSerial.write("sdl 0\n")
            console.log("written")
        });
  }
  render() {
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    const hours = [...Array(24).keys()];
    const minutes = [...Array(60).keys()];

    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to React Native!</Text>
        <Text style={styles.instructions}>To get started, edit App.js</Text>
        <Text style={styles.instructions}>{instructions}</Text>
        <Button
          onPress={this.getSchedules}
          title="Get schedules"
          color="#841584"
          accessibilityLabel="Learn more about this purple button"
        />
        <Picker
          selectedValue={this.state.day}
          mode="dropdown"
          style={styles.picker}
          onValueChange={(itemValue, itemIndex) =>
            this.setState({ day: itemValue })
          }>
          {this.renderDefaultValue("day")}
          {this.renderOptionsFrom(days)}
        </Picker>
        <Picker
          selectedValue={this.state.hour}
          mode="dropdown"
          style={styles.picker}
          onValueChange={(itemValue, itemIndex) =>
            this.setState({ hour: itemValue })
          }>
          {this.renderDefaultValue("hour")}
          {this.renderOptionsFrom(hours)}
        </Picker>
         <Picker
          selectedValue={this.state.minute}
          mode="dropdown"
          style={styles.picker}
          onValueChange={(itemValue, itemIndex) =>
            this.setState({ minute: itemValue })
          }>
          {this.renderDefaultValue("minute")}
          {this.renderOptionsFrom(minutes)}
        </Picker>
        <Button
          onPress={() => this.setState({hour: "", minute: "", day:""})}
          title="Reset"
          color="#841584"
          accessibilityLabel="Learn more about this purple button"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
   picker: {
      height: 70,
      width: 200,
    },
});
