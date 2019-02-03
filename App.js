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

import { CONNECTION_STATUS } from './Constants';
import { Message } from './Message';

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload u,\n' +
    'Shake or press menu button for dev menu',
});

type Props = {};
export default class App extends Component<Props> {
  state = {
    workdayHour: "",
    workdayMinute: "",
    holidayHour: "",
    holidayMinute: "",
    currentTime: "",
    successMessage: "",
    error: false,
    connectionStatus: CONNECTION_STATUS.CONNECTING,
  };

  workdaysBinary = "10111110";
  workdayBitmask = parseInt(this.workdaysBinary, 2);
  holidayBinary = "11000001";
  holidayBitmask = parseInt(this.holidayBinary, 2);
  
  maxBrightness = 255;
  minBrightness = 0;
  brightenPerSecond = 0.10;
  darkenPerSecond = 10;
  numberOfSchedules = 4; //turn-off and turn-on schedule

  hours = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
  minutes = [0,5,10,15,20,25,30,35,40,45,50,55];

  componentDidMount() {
    BluetoothSerial.withDelimiter('\n').then(() => {
      this.handleResponses();
    });

    return this.connectToDevice().then(connected => {
      if (connected) {
        this.setTime();
        this.getSchedules();
      }
    });
  }

  componentWillUnMount() {
    BluetoothSerial.disconnect();
  }

  setTime = () => {
    BluetoothSerial.isConnected()
      .then(connected => {
        if (connected) {
          const currentTime = new Date();
          const zoneOffset = currentTime.getTimezoneOffset() * 60; //seconds
          const timestamp = Math.floor(currentTime.getTime()/1000 - zoneOffset).toString();
          BluetoothSerial.write(`sdt ${timestamp}\n`);
        }
      });
  }

  getSchedules = () => {
    BluetoothSerial.write("gsc\n");
  }

  handleResponses = () => {
    BluetoothSerial.on('read', (response) => {
      console.log('Reading data: ', response)
      const data = response.data.replace("\r\n", "");
      const responseArray = data.split(" ");
      const schedulesReceived = responseArray[0] === "ACK" && responseArray.length > 2;
      const lampTurnedOff = data === "ACK 0";
      const scheduleSet = responseArray[0] === "ACK" && responseArray.length === 1;
      const timeSet = responseArray[0] === "ACK" && responseArray.length === 2;
      const error = response.data.startsWith("ERR");
      if (error) {
        this.setState({
          error: true,
          successMessage: "",
        });
        return;
      }
      if (scheduleSet) {
        this.setState({
          error: false,
          successMessage: "Schedule set!",
        });
        return;
      }
      if (lampTurnedOff) {
        this.setState({
          error: false,
          successMessage: "Lamp turned off",
        });
        return;
      }
      if (schedulesReceived) {
        const schedules = this.formSchedules(response.data);
        const turnOnSchedules = [schedules[0], schedules[2]];
        let workdayHour, workdayMinute, holidayHour, holidayMinute;
        turnOnSchedules.forEach(s => {
          if (s[0] === this.workdayBitmask.toString()) {
            workdayHour = s[1];
            workdayMinute = s[2];
          } else if (s[0] === this.holidayBitmask.toString()) {
            holidayHour = s[1];
            holidayMinute = s[2];
          }
        });
        this.setState({
          workdayHour: parseInt(workdayHour),
          workdayMinute: parseInt(workdayMinute),
          holidayHour: parseInt(holidayHour),
          holidayMinute: parseInt(holidayMinute),
        });
        return;
      }
      if (timeSet) {
        const zoneOffset = new Date().getTimezoneOffset() * 60; //seconds
        const timeReceived = new Date((Number(responseArray[1]) + zoneOffset) * 1000);
        this.setState({
          error: false,
          successMessage: "Time set!",
          currentTime: timeReceived.toString(),
        });
        return;
      }
    });
  }

  formSchedules = data => {
    let schedules = [];
    let schedule = [];
    let schedulesArray = data.split(" ").slice(2);
    schedulesArray.forEach(n => {
      if (schedule.length === 4) {
        schedule = schedule.concat(n);
        schedules = schedules.concat([schedule]);
        schedule = [];
      } else {
        schedule = schedule.concat(n);
      }
    })
    return schedules;
  }

  connectToDevice = () => {
    this.setState({
      connectionStatus: CONNECTION_STATUS.CONNECTING,
    })
    return BluetoothSerial.list()
      .then(devices => {
        console.log("devices", devices)
        const id = devices.find(device => device.name === "SUNLAMP").id;
        return BluetoothSerial.connect(id);
      }).then(()=> {
        this.setState({
          connectionStatus: CONNECTION_STATUS.CONNECTED,
        });
        return true;
      }).catch(error => {
        console.error("connection error", error)
        this.setState({
          connectionStatus: CONNECTION_STATUS.NOT_CONNECTED,
        });
        return false;
      })
  }

  renderOptionsFrom = options =>
    options.map(option => <Picker.Item key={option.toString()} label={option.toString()} value={option} />);

  renderDefaultValue = value => <Picker.Item label={`Select ${value}`} value="not selected"/>;

  turnOff = () => (
    BluetoothSerial.isConnected()
      .then(connected => {
        if (connected) {
          BluetoothSerial.write("sdl 0\n");
        } else {
          return this.connectToDevice().then(connected => {
            if (connected) {
              BluetoothSerial.write("sdl 0\n");
            }
          })
        }
      })
  );

  setSchedule = () => {
    return BluetoothSerial.isConnected()
      .then(connected => {
        if (connected) {
          const schedules = this.prepareForSending();
          this.send(schedules);
        } else {
          return this.connectToDevice().then(connected => {
            if (connected) {
              const schedules = this.prepareForSending();
              this.send(schedules);
            }
          });
        }
      })
  }

  prepareForSending = () => {
    const workdayTurnOnSchedule = `${this.workdayBitmask} ${this.state.workdayHour} ${this.state.workdayMinute} ${this.maxBrightness} ${this.brightenPerSecond}`;
    const workdayTurnOffSchedule = `${this.workdayBitmask} ${this.getTurnOffHour(this.state.workdayHour)} ${this.state.workdayMinute} ${this.minBrightness} ${this.darkenPerSecond}`;

    const holidayTurnOnSchedule = `${this.holidayBitmask} ${this.state.holidayHour} ${this.state.holidayMinute} ${this.maxBrightness} ${this.brightenPerSecond}`;
    const holidayTurnOffSchedule = `${this.holidayBitmask} ${this.getTurnOffHour(this.state.holidayHour)} ${this.state.holidayMinute} ${this.minBrightness} ${this.darkenPerSecond}`;
    
    return `${workdayTurnOnSchedule} ${workdayTurnOffSchedule} ${holidayTurnOnSchedule} ${holidayTurnOffSchedule}`
  }

  send = schedules =>  {
    console.log("schedules", `ssc ${this.numberOfSchedules} ${schedules}\n`)
    BluetoothSerial.write(`ssc ${this.numberOfSchedules} ${schedules}\n`);
  }

  getTurnOffHour = hour => hour === 23 ? 0 : hour + 1;

  render() {
    if (this.state.connectionStatus === CONNECTION_STATUS.CONNECTING) {
      return <View style={styles.container}>
        <Text style={styles.welcome}>Connecting...</Text>
      </View>
    }
    if (this.state.connectionStatus === CONNECTION_STATUS.NOT_CONNECTED) {
      return <View style={styles.container}>
        <Text style={styles.welcome}>Failed to connect!</Text>
        <Button
          onPress={this.connectToDevice}
          title="Try again"
          color="#841584"
          accessibilityLabel="Try connecting again"
        />
      </View>
    }

    const minuteOptions = this.renderOptionsFrom(this.minutes);
    const hoursOptions = this.renderOptionsFrom(this.hours);
    const hourDefault = this.renderDefaultValue("hour")
    const minuteDefault = this.renderDefaultValue("minute")

    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>Welcome to Lamp Control!</Text>
        <Button
          onPress={this.turnOff}
          title="Turn Off Lamp"
          color="#841584"
          accessibilityLabel="Turn off lamp"
        />
        <Text style={styles.welcome}>Current time: {this.state.currentTime}</Text>
        <Button
          onPress={this.setTime}
          title="Set time to current"
          color="#841584"
          accessibilityLabel="Set time to current"
        />

        <Message
          successMessage={this.state.successMessage}
          error={this.state.error}
        />
        <Text>Workday schedule</Text>
        <Picker
          selectedValue={this.state.workdayHour}
          mode="dropdown"
          style={styles.picker}
          onValueChange={itemValue => this.setState({ workdayHour: itemValue })}
          >
          {hourDefault}
          {hoursOptions}
        </Picker>
         <Picker
          selectedValue={this.state.workdayMinute}
          mode="dropdown"
          style={styles.picker}
          onValueChange={itemValue => this.setState({ workdayMinute: itemValue })}
          >
          {minuteDefault}
          {minuteOptions}
        </Picker>

        <Text>Holiday schedule</Text>
        <Picker
          selectedValue={this.state.holidayHour}
          mode="dropdown"
          style={styles.picker}
          onValueChange={itemValue => this.setState({ holidayHour: itemValue })}
          >
          {hourDefault}
          {hoursOptions}
        </Picker>
         <Picker
          selectedValue={this.state.holidayMinute}
          mode="dropdown"
          style={styles.picker}
          onValueChange={itemValue => this.setState({ holidayMinute: itemValue })}
          >
          {minuteDefault}
          {minuteOptions}
        </Picker>

        <Button
          onPress={this.setSchedule}
          title="Set schedule"
          color="#841584"
          accessibilityLabel="Set schedule"
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
