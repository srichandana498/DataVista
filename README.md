# DataVista – Real-Time Data Streaming System using Apache Kafka

## Overview

DataVista is a real-time data streaming system built using Apache Kafka. It demonstrates how data can be produced, transmitted, and consumed efficiently using a distributed messaging architecture.

## Architecture

The system follows a publish-subscribe model:

* Producers send data to Kafka topics
* Kafka broker manages and stores the data
* Consumers read and process data from topics

## Components

### Kafka Broker

Handles message storage, topic management, and data distribution across partitions.

### Zookeeper

Manages Kafka cluster coordination, broker registration, and leader election.

### Producer

Sends data (events/messages) to Kafka topics.

### Consumer

Subscribes to topics and processes incoming data in real time.

### Topics

Logical channels where messages are stored and categorized.

## Features

* Real-time data streaming
* Topic-based message organization
* Scalable and distributed architecture
* Fault-tolerant message handling
* Support for multiple producers and consumers

## Implementation

The project includes:

* Kafka setup and configuration
* Topic creation and partition management
* Producer modules for sending data
* Consumer modules for processing data streams

## Use Cases

* Real-time analytics systems
* Event-driven architectures
* Log aggregation pipelines
* Data processing workflows

## Conclusion

DataVista demonstrates the core principles of Apache Kafka in building scalable and efficient real-time data streaming systems. It highlights how distributed messaging enables seamless communication between different components of a system.
