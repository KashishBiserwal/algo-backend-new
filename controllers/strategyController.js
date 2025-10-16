const Strategy = require('../models/strategyModel');
const Instrument = require('../models/instrumentModel');
const brokerTokenService = require('../services/brokerTokenService');

// Create a new strategy
const createStrategy = async (req, res) => {
  try {
    const userId = req.user.id;
    const strategyData = req.body;

    // Validate required fields based on strategy type
    const requiredFields = ['name', 'type', 'start_time', 'square_off_time'];
    
    if (strategyData.type === 'time_based') {
      requiredFields.push('instrument', 'order_legs');
    } else if (strategyData.type === 'indicator_based') {
      requiredFields.push('instruments', 'entry_conditions');
    }
    
    for (const field of requiredFields) {
      if (!strategyData[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required for ${strategyData.type} strategy`
        });
      }
    }

    // Predefined instruments for time-based strategies (available for both strategy types)
    const predefinedInstruments = {
        'nifty-50-idx-nse': { 
          _id: 'nifty-50-idx-nse',
          symbol: 'NIFTY 50', 
          name: 'NIFTY 50', 
          exchange: 'NSE', 
          segment: 'IDX', 
          instrument_type: 'INDEX',
          lot_size: 1,
          tick_size: 0.05,
          brokers: {
            angel: { tradable: true, token: 'NIFTY50' },
            dhan: { tradable: true, token: 'NIFTY50' }
          }
        },
        'nifty-bank-idx-nse': { 
          _id: 'nifty-bank-idx-nse',
          symbol: 'NIFTY BANK', 
          name: 'NIFTY BANK', 
          exchange: 'NSE', 
          segment: 'IDX', 
          instrument_type: 'INDEX',
          lot_size: 1,
          tick_size: 0.05,
          brokers: {
            angel: { tradable: true, token: 'BANKNIFTY' },
            dhan: { tradable: true, token: 'BANKNIFTY' }
          }
        },
        'nifty-fin-service-idx-nse': { 
          _id: 'nifty-fin-service-idx-nse',
          symbol: 'NIFTY FIN SERVICE', 
          name: 'NIFTY FIN SERVICE', 
          exchange: 'NSE', 
          segment: 'IDX', 
          instrument_type: 'INDEX',
          lot_size: 1,
          tick_size: 0.05,
          brokers: {
            angel: { tradable: true, token: 'FINNIFTY' },
            dhan: { tradable: true, token: 'FINNIFTY' }
          }
        },
        'sensex-idx-bse': { 
          _id: 'sensex-idx-bse',
          symbol: 'SENSEX', 
          name: 'SENSEX', 
          exchange: 'BSE', 
          segment: 'IDX', 
          instrument_type: 'INDEX',
          lot_size: 1,
          tick_size: 0.05,
          brokers: {
            angel: { tradable: true, token: 'SENSEX' },
            dhan: { tradable: true, token: 'SENSEX' }
          }
        }
      };

    // Validate strategy type specific fields
    if (strategyData.type === 'time_based') {
      // Validate order legs
      if (!Array.isArray(strategyData.order_legs) || strategyData.order_legs.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one order leg is required for time-based strategy'
        });
      }

      // Validate instrument exists and is available on user's broker
      let instrument;
      
      // Check if it's a predefined instrument
      if (predefinedInstruments[strategyData.instrument]) {
        instrument = predefinedInstruments[strategyData.instrument];
      } else {
        // Try to find in database
        instrument = await Instrument.findById(strategyData.instrument);
        if (!instrument) {
          // Try to create a mock instrument for common formats
          if (strategyData.instrument.includes('-EQUITY') || strategyData.instrument.includes('-EQUITY-')) {
            const parts = strategyData.instrument.split('-');
            let symbol, exchange, segment;
            
            if (parts.length === 3) {
              // Format: SYMBOL-EXCHANGE-SEGMENT (e.g., RELIANCE-NSE-EQUITY)
              symbol = parts[0];
              exchange = parts[1];
              segment = parts[2];
            } else if (parts.length === 4) {
              // Format: SYMBOL-SEGMENT-EXCHANGE (e.g., TCS-EQUITY-NSE)
              symbol = parts[0];
              segment = parts[1];
              exchange = parts[3];
            } else {
              return res.status(404).json({
                success: false,
                message: `Invalid instrument format: ${strategyData.instrument}`
              });
            }
            
            instrument = {
              _id: strategyData.instrument,
              symbol: symbol,
              name: symbol,
              exchange: exchange,
              segment: segment,
              instrument_type: segment,
              lot_size: 1,
              tick_size: 0.05,
              brokers: {
                angel: { tradable: true, token: symbol },
                dhan: { tradable: true, token: symbol }
              }
            };
            console.log(`✅ Created mock instrument for strategy: ${symbol} on ${exchange} (${segment})`);
          } else {
            return res.status(404).json({
              success: false,
              message: 'Instrument not found'
            });
          }
        }
      }

      // Check if instrument is available on the specified broker
      const broker = strategyData.broker || 'angel'; // Default to angel
      if (!instrument.brokers[broker]?.tradable || !instrument.brokers[broker]?.token) {
        return res.status(400).json({
          success: false,
          message: `Instrument not available on ${broker} broker`
        });
      }
    } else if (strategyData.type === 'indicator_based') {
      // Validate instruments array
      if (!Array.isArray(strategyData.instruments) || strategyData.instruments.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one instrument is required for indicator-based strategy'
        });
      }

      // Validate entry conditions
      if (!Array.isArray(strategyData.entry_conditions) || strategyData.entry_conditions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one entry condition is required for indicator-based strategy'
        });
      }

      // Validate each instrument
      for (const inst of strategyData.instruments) {
        let instrument;
        
        // Check if it's a predefined instrument
        if (predefinedInstruments[inst.instrument_id]) {
          instrument = predefinedInstruments[inst.instrument_id];
        } else {
          // Try to find in database
          instrument = await Instrument.findById(inst.instrument_id);
          if (!instrument) {
            // Try to create a mock instrument for common formats
            if (inst.instrument_id.includes('-EQUITY') || inst.instrument_id.includes('-EQUITY-')) {
              const parts = inst.instrument_id.split('-');
              let symbol, exchange, segment;
              
              if (parts.length === 3) {
                // Format: SYMBOL-EXCHANGE-SEGMENT (e.g., RELIANCE-NSE-EQUITY)
                symbol = parts[0];
                exchange = parts[1];
                segment = parts[2];
              } else if (parts.length === 4) {
                // Format: SYMBOL-SEGMENT-EXCHANGE (e.g., TCS-EQUITY-NSE)
                symbol = parts[0];
                segment = parts[1];
                exchange = parts[3];
              } else {
                return res.status(404).json({
                  success: false,
                  message: `Invalid instrument format: ${inst.instrument_id}`
                });
              }
              
              instrument = {
                _id: inst.instrument_id,
                symbol: symbol,
                name: symbol,
                exchange: exchange,
                segment: segment,
                instrument_type: segment,
                lot_size: 1,
                tick_size: 0.05,
                brokers: {
                  angel: { tradable: true, token: symbol },
                  dhan: { tradable: true, token: symbol }
                }
              };
              console.log(`✅ Created mock instrument for indicator strategy: ${symbol} on ${exchange} (${segment})`);
            } else {
              return res.status(404).json({
                success: false,
                message: `Instrument not found: ${inst.instrument_id}`
              });
            }
          }
        }

        // Check if instrument is available on the specified broker
        const broker = strategyData.broker || 'angel';
        if (!instrument.brokers[broker]?.tradable || !instrument.brokers[broker]?.token) {
          return res.status(400).json({
            success: false,
            message: `Instrument ${inst.symbol} not available on ${broker} broker`
          });
        }
      }

      // Validate entry conditions
      for (const condition of strategyData.entry_conditions) {
        if (!condition.indicator1 || !condition.comparator || !condition.indicator2) {
          return res.status(400).json({
            success: false,
            message: 'Each entry condition must have indicator1, comparator, and indicator2'
          });
        }
      }
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(strategyData.start_time) || !timeRegex.test(strategyData.square_off_time)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:MM format'
      });
    }

    // Validate start time is before square off time
    const startTime = new Date(`2000-01-01 ${strategyData.start_time}`);
    const squareOffTime = new Date(`2000-01-01 ${strategyData.square_off_time}`);
    if (startTime >= squareOffTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before square off time'
      });
    }

    // Validate at least one trading day is selected
    const tradingDays = strategyData.trading_days || {};
    const hasTradingDay = Object.values(tradingDays).some(day => day === true);
    if (!hasTradingDay) {
      return res.status(400).json({
        success: false,
        message: 'At least one trading day must be selected'
      });
    }

    // Create strategy
    const broker = strategyData.broker || 'angel'; // Default to angel
    const strategy = new Strategy({
      ...strategyData,
      created_by: userId,
      broker: broker,
      status: 'draft'
    });

    await strategy.save();

    res.status(201).json({
      success: true,
      message: 'Strategy created successfully',
      data: strategy
    });

  } catch (error) {
    console.error('Error in createStrategy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create strategy',
      error: error.message
    });
  }
};

// Get all strategies for a user
const getStrategies = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🔍 Getting strategies for user:', userId);
    console.log('🔍 User object:', req.user);
    
    const { status, type, page = 1, limit = 10 } = req.query;
    console.log('🔍 Query params:', { status, type, page, limit });

    const filter = { created_by: userId };
    if (status) filter.status = status;
    if (type) filter.type = type;
    
    console.log('🔍 Filter:', filter);

    const strategies = await Strategy.find(filter)
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('created_by', 'username email');

    const total = await Strategy.countDocuments(filter);
    
    console.log('🔍 Found strategies:', strategies.length);
    console.log('🔍 Total strategies:', total);
    console.log('🔍 Strategies:', strategies.map(s => ({ id: s._id, name: s.name, created_by: s.created_by })));

    res.status(200).json({
      success: true,
      message: 'Strategies fetched successfully',
      data: {
        strategies,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });

  } catch (error) {
    console.error('Error in getStrategies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch strategies',
      error: error.message
    });
  }
};

// Get a specific strategy
const getStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const strategy = await Strategy.findOne({ _id: id, created_by: userId })
      .populate('created_by', 'username email');

    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Strategy fetched successfully',
      data: strategy
    });

  } catch (error) {
    console.error('Error in getStrategy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch strategy',
      error: error.message
    });
  }
};

// Update a strategy
const updateStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const strategy = await Strategy.findOne({ _id: id, created_by: userId });
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    // Handle strategy status during updates
    if (strategy.status === 'active') {
      // If updating an active strategy, automatically stop it first
      console.log(`⚠️ Updating active strategy ${id}, stopping it first`);
      strategy.status = 'stopped';
      await strategy.save();
    }
    
    // Reset status to draft when updating (allows for re-deployment)
    if (updateData.status === undefined) {
      updateData.status = 'draft';
    }

    // Predefined instruments for time-based strategies (same as in create function)
    const predefinedInstruments = {
      'nifty-50-idx-nse': { 
        _id: 'nifty-50-idx-nse',
        symbol: 'NIFTY 50', 
        name: 'NIFTY 50', 
        exchange: 'NSE', 
        segment: 'IDX', 
        instrument_type: 'INDEX',
        lot_size: 1,
        tick_size: 0.05,
        brokers: {
          angel: { tradable: true, token: 'NIFTY50' },
          dhan: { tradable: true, token: 'NIFTY50' }
        }
      },
      'nifty-bank-idx-nse': { 
        _id: 'nifty-bank-idx-nse',
        symbol: 'NIFTY BANK', 
        name: 'NIFTY BANK', 
        exchange: 'NSE', 
        segment: 'IDX', 
        instrument_type: 'INDEX',
        lot_size: 1,
        tick_size: 0.05,
        brokers: {
          angel: { tradable: true, token: 'BANKNIFTY' },
          dhan: { tradable: true, token: 'BANKNIFTY' }
        }
      },
      'nifty-fin-service-idx-nse': { 
        _id: 'nifty-fin-service-idx-nse',
        symbol: 'NIFTY FIN SERVICE', 
        name: 'NIFTY FIN SERVICE', 
        exchange: 'NSE', 
        segment: 'IDX', 
        instrument_type: 'INDEX',
        lot_size: 1,
        tick_size: 0.05,
        brokers: {
          angel: { tradable: true, token: 'FINNIFTY' },
          dhan: { tradable: true, token: 'FINNIFTY' }
        }
      },
      'sensex-idx-bse': { 
        _id: 'sensex-idx-bse',
        symbol: 'SENSEX', 
        name: 'SENSEX', 
        exchange: 'BSE', 
        segment: 'IDX', 
        instrument_type: 'INDEX',
        lot_size: 1,
        tick_size: 0.05,
        brokers: {
          angel: { tradable: true, token: 'SENSEX' },
          dhan: { tradable: true, token: 'SENSEX' }
        }
      }
    };

    // Validate instrument if being updated
    if (updateData.instrument) {
      console.log('🔍 Updating strategy with instrument:', updateData.instrument);

      let instrument;
      
      // Check if it's a predefined instrument
      if (predefinedInstruments[updateData.instrument]) {
        instrument = predefinedInstruments[updateData.instrument];
      } else {
        // Try to find in database
        instrument = await Instrument.findById(updateData.instrument);
        if (!instrument) {
          // Try to create a mock instrument for common formats
          if (updateData.instrument.includes('-EQUITY') || updateData.instrument.includes('-EQUITY-')) {
            const parts = updateData.instrument.split('-');
            let symbol, exchange, segment;
            
            if (parts.length === 3) {
              // Format: SYMBOL-EXCHANGE-SEGMENT (e.g., RELIANCE-NSE-EQUITY)
              symbol = parts[0];
              exchange = parts[1];
              segment = parts[2];
            } else if (parts.length === 4) {
              // Format: SYMBOL-SEGMENT-EXCHANGE (e.g., TCS-EQUITY-NSE)
              symbol = parts[0];
              segment = parts[1];
              exchange = parts[3];
            } else {
              return res.status(404).json({
                success: false,
                message: `Invalid instrument format: ${updateData.instrument}`
              });
            }
            
            instrument = {
              _id: updateData.instrument,
              symbol: symbol,
              name: symbol,
              exchange: exchange,
              segment: segment,
              instrument_type: segment,
              lot_size: 1,
              tick_size: 0.05,
              brokers: {
                angel: { tradable: true, token: symbol },
                dhan: { tradable: true, token: symbol }
              }
            };
            console.log(`✅ Created mock instrument for strategy update: ${symbol} on ${exchange} (${segment})`);
          } else {
            return res.status(404).json({
              success: false,
              message: 'Instrument not found'
            });
          }
        }
      }

      const broker = updateData.broker || strategy.broker;
      if (!instrument.brokers[broker]?.tradable || !instrument.brokers[broker]?.token) {
        return res.status(400).json({
          success: false,
          message: `Instrument not available on ${broker} broker`
        });
      }
    }

    // Validate instruments array if being updated (for indicator-based strategies)
    if (updateData.instruments && Array.isArray(updateData.instruments)) {
      console.log('🔍 Updating strategy with instruments:', updateData.instruments);
      for (const inst of updateData.instruments) {
        let instrument;
        
        // Check if it's a predefined instrument
        if (predefinedInstruments[inst.instrument_id]) {
          instrument = predefinedInstruments[inst.instrument_id];
        } else {
          // Try to find in database
          instrument = await Instrument.findById(inst.instrument_id);
          if (!instrument) {
            // Try to create a mock instrument for common formats
            if (inst.instrument_id.includes('-EQUITY') || inst.instrument_id.includes('-EQUITY-')) {
              const parts = inst.instrument_id.split('-');
              let symbol, exchange, segment;
              
              if (parts.length === 3) {
                // Format: SYMBOL-EXCHANGE-SEGMENT (e.g., RELIANCE-NSE-EQUITY)
                symbol = parts[0];
                exchange = parts[1];
                segment = parts[2];
              } else if (parts.length === 4) {
                // Format: SYMBOL-SEGMENT-EXCHANGE (e.g., TCS-EQUITY-NSE)
                symbol = parts[0];
                segment = parts[1];
                exchange = parts[3];
              } else {
                return res.status(404).json({
                  success: false,
                  message: `Invalid instrument format: ${inst.instrument_id}`
                });
              }
              
              instrument = {
                _id: inst.instrument_id,
                symbol: symbol,
                name: symbol,
                exchange: exchange,
                segment: segment,
                instrument_type: segment,
                lot_size: 1,
                tick_size: 0.05,
                brokers: {
                  angel: { tradable: true, token: symbol },
                  dhan: { tradable: true, token: symbol }
                }
              };
              console.log(`✅ Created mock instrument for indicator strategy update: ${symbol} on ${exchange} (${segment})`);
            } else {
              return res.status(404).json({
                success: false,
                message: `Instrument not found: ${inst.instrument_id}`
              });
            }
          }
        }

        // Check if instrument is available on the specified broker
        const broker = updateData.broker || strategy.broker;
        if (!instrument.brokers[broker]?.tradable || !instrument.brokers[broker]?.token) {
          return res.status(400).json({
            success: false,
            message: `Instrument ${inst.symbol} not available on ${broker} broker`
          });
        }
      }
    }

    // Update strategy
    const updatedStrategy = await Strategy.findByIdAndUpdate(
      id,
      { ...updateData, updated_at: new Date() },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Strategy updated successfully',
      data: updatedStrategy
    });

  } catch (error) {
    console.error('Error in updateStrategy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update strategy',
      error: error.message
    });
  }
};

// Delete a strategy
const deleteStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const strategy = await Strategy.findOne({ _id: id, created_by: userId });
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    // Don't allow deleting active strategies
    if (strategy.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete active strategy. Please stop it first.'
      });
    }

    await Strategy.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Strategy deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteStrategy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete strategy',
      error: error.message
    });
  }
};

// Start/Stop strategy
const toggleStrategyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'start' or 'stop'
    const userId = req.user.id;

    const strategy = await Strategy.findOne({ _id: id, created_by: userId });
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    let newStatus;
    if (action === 'start') {
      if (strategy.status === 'active') {
        return res.status(400).json({
          success: false,
          message: 'Strategy is already active'
        });
      }
      // Can start from draft, backtested, or stopped status
      if (!['draft', 'backtested', 'stopped'].includes(strategy.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot start strategy from ${strategy.status} status`
        });
      }
      newStatus = 'active';
    } else if (action === 'stop') {
      if (strategy.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Strategy is not active'
        });
      }
      newStatus = 'stopped';
    } else if (action === 'pause') {
      if (strategy.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Only active strategies can be paused'
        });
      }
      newStatus = 'paused';
    } else if (action === 'resume') {
      if (strategy.status !== 'paused') {
        return res.status(400).json({
          success: false,
          message: 'Only paused strategies can be resumed'
        });
      }
      newStatus = 'active';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "start", "stop", "pause", or "resume"'
      });
    }

    const updatedStrategy = await Strategy.findByIdAndUpdate(
      id,
      { status: newStatus, updated_at: new Date() },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Strategy ${action}ed successfully`,
      data: updatedStrategy
    });

  } catch (error) {
    console.error('Error in toggleStrategyStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle strategy status',
      error: error.message
    });
  }
};

// Get strategy performance
const getStrategyPerformance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const strategy = await Strategy.findOne({ _id: id, created_by: userId });
    if (!strategy) {
      return res.status(404).json({
        success: false,
        message: 'Strategy not found'
      });
    }

    const performance = {
      total_trades: strategy.total_trades,
      successful_trades: strategy.successful_trades,
      total_profit: strategy.total_profit,
      total_loss: strategy.total_loss,
      net_pnl: strategy.net_pnl,
      success_rate: strategy.total_trades > 0 ? (strategy.successful_trades / strategy.total_trades * 100).toFixed(2) : 0,
      execution_history: strategy.execution_history.slice(-10) // Last 10 executions
    };

    res.status(200).json({
      success: true,
      message: 'Strategy performance fetched successfully',
      data: performance
    });

  } catch (error) {
    console.error('Error in getStrategyPerformance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch strategy performance',
      error: error.message
    });
  }
};

// Validate strategy before creation
const validateStrategy = async (req, res) => {
  try {
    const strategyData = req.body;

    // Validate based on strategy type
    let validations = {
      time_format_valid: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(strategyData.start_time) && 
                        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(strategyData.square_off_time),
      trading_days_selected: Object.values(strategyData.trading_days || {}).some(day => day === true)
    };

    if (strategyData.type === 'time_based') {
      // Validate time-based strategy
      const instrument = await Instrument.findById(strategyData.instrument);
      if (!instrument) {
        return res.status(404).json({
          success: false,
          message: 'Instrument not found'
        });
      }

      const broker = strategyData.broker || 'angel';
      const brokerValidation = await brokerTokenService.validateStrategyForBroker(
        { symbol: strategyData.instrument },
        broker
      );

      validations = {
        ...validations,
        instrument_available: true,
        broker_compatible: brokerValidation.valid,
        order_legs_valid: Array.isArray(strategyData.order_legs) && strategyData.order_legs.length > 0
      };
    } else if (strategyData.type === 'indicator_based') {
      // Validate indicator-based strategy
      let allInstrumentsValid = true;
      let allBrokersCompatible = true;

      for (const inst of strategyData.instruments || []) {
        const instrument = await Instrument.findById(inst.instrument_id);
        if (!instrument) {
          allInstrumentsValid = false;
          break;
        }

        const broker = strategyData.broker || 'angel';
        if (!instrument.brokers[broker]?.tradable || !instrument.brokers[broker]?.token) {
          allBrokersCompatible = false;
          break;
        }
      }

      validations = {
        ...validations,
        instrument_available: allInstrumentsValid,
        broker_compatible: allBrokersCompatible,
        instruments_valid: Array.isArray(strategyData.instruments) && strategyData.instruments.length > 0,
        entry_conditions_valid: Array.isArray(strategyData.entry_conditions) && strategyData.entry_conditions.length > 0
      };
    }

    const allValid = Object.values(validations).every(v => v === true);

    res.status(200).json({
      success: true,
      message: allValid ? 'Strategy validation passed' : 'Strategy validation failed',
      data: {
        valid: allValid,
        validations
      }
    });

  } catch (error) {
    console.error('Error in validateStrategy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate strategy',
      error: error.message
    });
  }
};

module.exports = {
  createStrategy,
  getStrategies,
  getStrategy,
  updateStrategy,
  deleteStrategy,
  toggleStrategyStatus,
  getStrategyPerformance,
  validateStrategy
};
